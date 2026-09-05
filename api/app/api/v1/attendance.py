import calendar
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import rate_limit
from app.core.attendance_compute import MissingShiftError, resolve_work_date_for_punch
from app.core.audit import model_to_dict, record_audit
from app.core.deps import get_current_employee, get_current_user, require_role
from app.db import get_db
from app.models import AttendanceDaily, AttendanceLog, Department, Designation, Employee, Holiday, Shift, User
from app.models.enums import AttendanceStatus, EmploymentStatus, EmploymentType, UserRole, WorkLocation
from app.schemas.attendance import AttendanceDailyOut, AttendanceOverrideIn, PunchGeoIn, PunchIn, PunchOut
from app.services.attendance import recompute_work_date

router = APIRouter(prefix="/attendance", tags=["attendance"])

PUNCH_RATE_LIMIT = 10
PUNCH_RATE_WINDOW_SECONDS = 60
PUNCH_TOO_SOON_SECONDS = 3
LOW_ACCURACY_THRESHOLD_METRES = 100


def _geo_flag(geo: PunchGeoIn | None) -> str | None:
    if geo is None:
        return None
    if geo.is_mock_location:
        return "mock_detected"
    if geo.accuracy_metres is not None and geo.accuracy_metres > LOW_ACCURACY_THRESHOLD_METRES:
        return "low_accuracy"
    return None


def _to_punch_out(log: AttendanceLog) -> PunchOut:
    geo = None
    if log.latitude is not None and log.longitude is not None:
        geo = PunchGeoIn(
            latitude=log.latitude,
            longitude=log.longitude,
            accuracy_metres=log.accuracy_metres,
            is_mock_location=log.is_mock_location,
        )
    return PunchOut(
        id=log.id,
        employee_id=log.employee_id,
        punch_time_utc=log.punch_time_utc,
        source=log.source,
        direction_hint=log.direction_hint,
        latitude=log.latitude,
        longitude=log.longitude,
        accuracy_metres=log.accuracy_metres,
        is_mock_location=log.is_mock_location,
        geo_flag=_geo_flag(geo),
    )


@router.post("/punch", response_model=PunchOut, status_code=status.HTTP_201_CREATED)
async def punch(
    payload: PunchIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    existing = (
        await db.execute(
            select(AttendanceLog).where(AttendanceLog.client_punch_id == payload.client_punch_id)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return _to_punch_out(existing)

    rate_key = f"punch:{current_user.id}"
    if not await rate_limit.check_and_increment(
        rate_key, limit=PUNCH_RATE_LIMIT, window_seconds=PUNCH_RATE_WINDOW_SECONDS
    ):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many punch attempts")

    last = (
        await db.execute(
            select(AttendanceLog)
            .where(AttendanceLog.employee_id == employee.id)
            .order_by(AttendanceLog.punch_time_utc.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if last is not None:
        seconds_since_last = (now - last.punch_time_utc.replace(tzinfo=UTC)).total_seconds()
        if seconds_since_last < PUNCH_TOO_SOON_SECONDS:
            raise HTTPException(status.HTTP_409_CONFLICT, "Too soon since last punch")

    geo_fields = {}
    if payload.geo is not None:
        geo_fields = {
            "latitude": payload.geo.latitude,
            "longitude": payload.geo.longitude,
            "accuracy_metres": payload.geo.accuracy_metres,
            "is_mock_location": payload.geo.is_mock_location,
        }

    log = AttendanceLog(
        employee_id=employee.id,
        punch_time_utc=now,
        source=payload.source,
        direction_hint=payload.direction_hint,
        client_punch_id=payload.client_punch_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        **geo_fields,
    )
    db.add(log)
    await db.flush()

    shift = None
    if employee.shift_id is not None:
        shift = (await db.execute(select(Shift).where(Shift.id == employee.shift_id))).scalar_one_or_none()
    if shift is not None:
        work_date = resolve_work_date_for_punch(now, shift)
        try:
            await recompute_work_date(db, employee, work_date)
        except MissingShiftError:
            pass

    await db.commit()
    await db.refresh(log)
    return _to_punch_out(log)


@router.get("/today", response_model=list[PunchOut])
async def today_punches(
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    ist = ZoneInfo("Asia/Kolkata")
    now_local = datetime.now(ist)
    day_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    day_start_utc = day_start_local.astimezone(UTC)
    day_end_utc = (day_start_local + timedelta(days=1)).astimezone(UTC)

    stmt = (
        select(AttendanceLog)
        .where(
            AttendanceLog.employee_id == employee.id,
            AttendanceLog.punch_time_utc >= day_start_utc,
            AttendanceLog.punch_time_utc < day_end_utc,
        )
        .order_by(AttendanceLog.punch_time_utc)
    )
    logs = (await db.execute(stmt)).scalars().all()
    return [_to_punch_out(log) for log in logs]


@router.get(
    "/matrix",
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.HR, UserRole.ADMIN))],
)
async def get_attendance_matrix(
    year: int = Query(..., ge=2020, le=2050),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    _, num_days = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, num_days)

    stmt = (
        select(Employee, Designation, Shift)
        .outerjoin(Designation, Employee.designation_id == Designation.id)
        .outerjoin(Shift, Employee.shift_id == Shift.id)
        .where(
            Employee.employment_status == EmploymentStatus.ACTIVE,
            Employee.employee_code.startswith("ACT"),
        )
        .order_by(Employee.employee_code)
    )
    emp_results = (await db.execute(stmt)).all()

    h_stmt = select(Holiday).where(Holiday.holiday_date >= start_date, Holiday.holiday_date <= end_date)
    holidays = {h.holiday_date: h.name for h in (await db.execute(h_stmt)).scalars().all()}

    ad_stmt = select(AttendanceDaily).where(
        AttendanceDaily.work_date >= start_date,
        AttendanceDaily.work_date <= end_date,
    )
    daily_records = {}
    for d in (await db.execute(ad_stmt)).scalars().all():
        daily_records[(d.employee_id, d.work_date)] = d

    all_shifts = (await db.execute(select(Shift))).scalars().all()
    shift_lookup = {s.id: s for s in all_shifts}

    headers = []
    for day in range(1, num_days + 1):
        cur_d = date(year, month, day)
        headers.append({
            "day": day,
            "date": cur_d.isoformat(),
            "weekday": cur_d.strftime("%a"),
            "label": f"{cur_d.strftime('%a')}, {day:02d}/{cur_d.strftime('%b')}",
            "is_weekend": cur_d.weekday() in (5, 6),
        })

    rows = []
    for idx, (emp, desig, shift) in enumerate(emp_results, start=1):
        shift_name = shift.name if shift else "Shift G"
        if "Shift B" in shift_name or "Afternoon" in shift_name:
            assigned_shift_code = "B"
        elif "Shift C" in shift_name or "Night" in shift_name:
            assigned_shift_code = "C"
        else:
            assigned_shift_code = "G"

        days_data = []
        for day in range(1, num_days + 1):
            cur_d = date(year, month, day)
            rec = daily_records.get((emp.id, cur_d))

            if rec is not None:
                rec_shift = shift_lookup.get(rec.shift_id)
                s_name = rec_shift.name if rec_shift else shift_name
                if "Shift B" in s_name or "Afternoon" in s_name:
                    s_code = "B"
                elif "Shift C" in s_name or "Night" in s_name:
                    s_code = "C"
                else:
                    s_code = "G"

                if rec.status == AttendanceStatus.ON_LEAVE:
                    code = "L"
                    status_str = "on_leave"
                elif rec.status == AttendanceStatus.WEEKLY_OFF:
                    code = "WO"
                    status_str = "weekly_off"
                elif rec.status == AttendanceStatus.HOLIDAY:
                    code = "HO"
                    status_str = "holiday"
                elif rec.status == AttendanceStatus.ABSENT:
                    code = "A"
                    status_str = "absent"
                else:
                    code = s_code
                    status_str = rec.status.value
            else:
                # No attendance recorded for this date -> must be EMPTY!
                code = ""
                status_str = "unrecorded"

            days_data.append({
                "day": day,
                "date": cur_d.isoformat(),
                "code": code,
                "status": status_str,
                "worked_minutes": rec.worked_minutes if rec else None,
            })

        rows.append({
            "s_no": idx,
            "employee_id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "official_email": emp.official_email,
            "designation": desig.title if desig else "Engineer",
            "shift_code": assigned_shift_code,
            "shift_name": shift_name,
            "days": days_data,
        })

    return {
        "year": year,
        "month": month,
        "num_days": num_days,
        "headers": headers,
        "shifts_legend": [
            {"code": "G", "name": "General Shift", "start": "9:30 AM", "end": "7:00 PM", "description": "General standard operations"},
            {"code": "B", "name": "Afternoon Shift", "start": "3:00 PM", "end": "12:00 AM", "description": "Evening / second shift"},
            {"code": "C", "name": "Night Shift", "start": "10:00 PM", "end": "7:00 AM", "description": "Night 24/7 NOC shift"},
            {"code": "WO", "name": "Week OFF", "start": "—", "end": "—", "description": "Scheduled weekly rest day"},
            {"code": "HO", "name": "Holiday", "start": "—", "end": "—", "description": "Public holiday"},
            {"code": "L", "name": "Planned Leave", "start": "—", "end": "—", "description": "Planned absence / leave"},
        ],
        "rows": rows,
    }


DEFAULT_GOOGLE_SHEET_CSV_URL = (
    "https://docs.google.com/spreadsheets/d/1N4wWf4Fk1x16ViGQzjMGiGgKUIBR-mpw/export?format=csv&gid=577875166"
)


@router.post(
    "/sync-google-sheet",
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.HR, UserRole.ADMIN))],
)
async def sync_google_sheet(
    sheet_url: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    import csv
    import io
    import re
    import httpx

    target_url = sheet_url or DEFAULT_GOOGLE_SHEET_CSV_URL
    if "/edit" in target_url:
        base = target_url.split("/edit")[0] + "/export?format=csv"
        gid_match = re.search(r"gid=(\d+)", target_url)
        target_url = f"{base}&gid={gid_match.group(1)}" if gid_match else base

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(target_url)
            resp.raise_for_status()
            csv_text = resp.text
    except Exception as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Failed to fetch Google Sheet: {exc}",
        )

    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Google Sheet is empty")

    header_row = rows[0]
    date_cols = {}
    current_year = date.today().year

    for col_idx, col_name in enumerate(header_row):
        m = re.search(r"(\d{1,2})/([A-Za-z]{3})", col_name)
        if m:
            day_num = int(m.group(1))
            month_str = m.group(2)
            try:
                month_num = datetime.strptime(month_str, "%b").month
                col_date = date(current_year, month_num, day_num)
                date_cols[col_idx] = col_date
            except Exception:
                continue

    shifts_res = await db.execute(select(Shift))
    shifts_list = shifts_res.scalars().all()
    shift_map = {}
    for s in shifts_list:
        if "Shift G" in s.name or "General" in s.name:
            shift_map["G"] = s
        elif "Shift B" in s.name or "Afternoon" in s.name:
            shift_map["B"] = s
        elif "Shift C" in s.name or "Night" in s.name:
            shift_map["C"] = s

    default_shift = shift_map.get("G") or (shifts_list[0] if shifts_list else None)

    synced_employees = 0
    synced_records = 0

    for row in rows[1:]:
        if not row or len(row) < 3:
            continue
        s_no_str = row[0].strip()
        if not s_no_str.isdigit():
            # If we reached the empty row or Shifts legend, stop processing
            first_cell = s_no_str.lower()
            if not first_cell or "shift" in first_cell or "timing" in first_cell:
                break
            continue

        emp_name = row[1].strip()
        act_id = row[2].strip()

        # Only accept valid Act ID
        if not act_id or not act_id.upper().startswith("ACT"):
            continue

        emp_stmt = select(Employee).where(Employee.employee_code == act_id)
        emp = (await db.execute(emp_stmt)).scalar_one_or_none()
        if not emp:
            email_alias = emp_name.lower().replace(" ", ".") + "@company.local"
            emp = Employee(
                employee_code=act_id,
                full_name=emp_name,
                official_email=email_alias,
                date_of_joining=date(current_year, 1, 1),
                employment_type=EmploymentType.FULL_TIME,
                shift_id=default_shift.id if default_shift else None,
                work_location=WorkLocation.OFFICE,
                employment_status=EmploymentStatus.ACTIVE,
            )
            db.add(emp)
            await db.flush()

        synced_employees += 1

        for col_idx, col_date in date_cols.items():
            if col_idx >= len(row):
                continue
            code = row[col_idx].strip().upper()
            if not code:
                continue

            s_obj = shift_map.get(code, default_shift)
            if code in ("G", "B", "C"):
                att_status = AttendanceStatus.PRESENT
                worked_mins = s_obj.full_day_minutes if s_obj else 480
            elif code == "WO":
                att_status = AttendanceStatus.WEEKLY_OFF
                worked_mins = 0
            elif code == "HO":
                att_status = AttendanceStatus.HOLIDAY
                worked_mins = 0
            elif code == "L":
                att_status = AttendanceStatus.ON_LEAVE
                worked_mins = 0
            else:
                att_status = AttendanceStatus.PRESENT
                worked_mins = 480

            ad_stmt = select(AttendanceDaily).where(
                AttendanceDaily.employee_id == emp.id,
                AttendanceDaily.work_date == col_date,
            )
            existing_daily = (await db.execute(ad_stmt)).scalar_one_or_none()
            if existing_daily:
                existing_daily.status = att_status
                existing_daily.shift_id = s_obj.id if s_obj else existing_daily.shift_id
                existing_daily.worked_minutes = worked_mins
            else:
                new_daily = AttendanceDaily(
                    employee_id=emp.id,
                    work_date=col_date,
                    shift_id=s_obj.id if s_obj else (default_shift.id if default_shift else 1),
                    status=att_status,
                    worked_minutes=worked_mins,
                )
                db.add(new_daily)

            synced_records += 1

    await db.commit()
    return {
        "status": "ok",
        "message": f"Successfully synced {synced_employees} employees and {synced_records} attendance records from Google Sheets",
        "employees_synced": synced_employees,
        "records_synced": synced_records,
        "source_url": target_url,
        "synced_at": datetime.now(UTC).isoformat(),
    }


@router.get(
    "/{employee_id}",
    response_model=list[AttendanceDailyOut],
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.HR, UserRole.ADMIN))],
)
async def employee_attendance(
    employee_id: int,
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.MANAGER:
        target = (await db.execute(select(Employee).where(Employee.id == employee_id))).scalar_one_or_none()
        if target is None or target.reporting_manager_id != current_user.employee_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a direct report")

    stmt = select(AttendanceDaily).where(
        AttendanceDaily.employee_id == employee_id,
        AttendanceDaily.work_date >= from_,
        AttendanceDaily.work_date <= to,
    ).order_by(AttendanceDaily.work_date)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.patch(
    "/daily/{daily_id}/override",
    response_model=AttendanceDailyOut,
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def override_daily(
    daily_id: int,
    payload: AttendanceOverrideIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    daily = (
        await db.execute(select(AttendanceDaily).where(AttendanceDaily.id == daily_id))
    ).scalar_one_or_none()
    if daily is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attendance record not found")

    before = model_to_dict(daily)

    if payload.first_in_utc is not None:
        daily.first_in_utc = payload.first_in_utc
    if payload.last_out_utc is not None:
        daily.last_out_utc = payload.last_out_utc
    if payload.status is not None:
        daily.status = payload.status
    daily.is_manual_override = True
    daily.override_reason = payload.reason
    daily.override_by = current_user.id

    await db.flush()
    await db.refresh(daily)
    await record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="attendance_daily",
        entity_id=daily.id,
        action="override",
        before=before,
        after=model_to_dict(daily),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(daily)
    return daily
