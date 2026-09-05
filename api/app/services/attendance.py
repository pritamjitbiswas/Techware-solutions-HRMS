from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.attendance_compute import LOCAL_TZ, MissingShiftError, compute_daily
from app.models import AttendanceDaily, AttendanceLog, Employee, Holiday, LeaveRequest, Shift, WeeklyOff
from app.models.enums import AttendanceSource, DirectionHint, LeaveRequestStatus

RECOMPUTE_FIELDS = (
    "shift_id",
    "first_in_utc",
    "last_out_utc",
    "worked_minutes",
    "break_minutes",
    "overtime_minutes",
    "late_by_minutes",
    "early_out_minutes",
    "status",
)


async def _gather_compute_context(db: AsyncSession, employee: Employee, work_date: date):
    shift = None
    if employee.shift_id is not None:
        shift = (await db.execute(select(Shift).where(Shift.id == employee.shift_id))).scalar_one_or_none()

    weekly_offs: set[int] = set()
    if shift is not None:
        rows = (
            await db.execute(select(WeeklyOff.weekday).where(WeeklyOff.shift_id == shift.id))
        ).scalars().all()
        weekly_offs = set(rows)

    holiday = (
        await db.execute(select(Holiday).where(Holiday.holiday_date == work_date))
    ).scalar_one_or_none()

    approved_leave = (
        await db.execute(
            select(LeaveRequest).where(
                LeaveRequest.employee_id == employee.id,
                LeaveRequest.status == LeaveRequestStatus.APPROVED,
                LeaveRequest.from_date <= work_date,
                LeaveRequest.to_date >= work_date,
            )
        )
    ).scalar_one_or_none()

    return shift, weekly_offs, holiday, approved_leave


async def _upsert_daily(
    db: AsyncSession, employee: Employee, work_date: date, computed: AttendanceDaily, *, force: bool
) -> AttendanceDaily:
    existing = (
        await db.execute(
            select(AttendanceDaily).where(
                AttendanceDaily.employee_id == employee.id, AttendanceDaily.work_date == work_date
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        db.add(computed)
        await db.flush()
        return computed

    if existing.is_manual_override and not force:
        return existing

    override_fields = ("is_manual_override", "override_reason", "override_by")
    fields = (*RECOMPUTE_FIELDS, *override_fields) if force else RECOMPUTE_FIELDS
    for field in fields:
        setattr(existing, field, getattr(computed, field))
    await db.flush()
    return existing


async def recompute_work_date(db: AsyncSession, employee: Employee, work_date: date) -> AttendanceDaily:
    """Recompute and upsert attendance_daily for one employee/work_date.

    Never overwrites a row an HR/ADMIN has manually overridden — attendance_daily
    is derived data (spec 5, rule 2), but a manual override is a deliberate
    correction that must survive automatic recomputation.
    """
    shift, weekly_offs, holiday, approved_leave = await _gather_compute_context(db, employee, work_date)

    punches: list[AttendanceLog] = []
    if shift is not None:
        window_start = datetime.combine(work_date - timedelta(days=1), datetime.min.time(), tzinfo=UTC)
        window_end = datetime.combine(work_date + timedelta(days=2), datetime.min.time(), tzinfo=UTC)
        stmt = select(AttendanceLog).where(
            AttendanceLog.employee_id == employee.id,
            AttendanceLog.punch_time_utc >= window_start,
            AttendanceLog.punch_time_utc < window_end,
        )
        punches = list((await db.execute(stmt)).scalars().all())

    computed = compute_daily(employee, work_date, punches, shift, weekly_offs, holiday, approved_leave)
    return await _upsert_daily(db, employee, work_date, computed, force=False)


async def apply_regularisation_override(
    db: AsyncSession,
    employee: Employee,
    work_date: date,
    requested_in_time: time | None,
    requested_out_time: time | None,
    reason: str,
    approver_id: int,
) -> AttendanceDaily:
    """An approved regularisation overrides derived in/out times (spec 7) — reuses
    the compute engine with synthetic punches built from the requested times, then
    marks the result as a manual override so future recomputes won't clobber it.
    """
    shift, weekly_offs, holiday, approved_leave = await _gather_compute_context(db, employee, work_date)
    if shift is None:
        raise MissingShiftError(f"Employee {employee.id} has no shift assigned for {work_date}")

    synthetic_punches: list[AttendanceLog] = []
    if requested_in_time is not None:
        in_dt = datetime.combine(work_date, requested_in_time, tzinfo=LOCAL_TZ).astimezone(UTC)
        synthetic_punches.append(
            AttendanceLog(
                employee_id=employee.id, punch_time_utc=in_dt,
                source=AttendanceSource.WEB, direction_hint=DirectionHint.IN,
            )
        )
    if requested_out_time is not None:
        out_date = work_date + timedelta(days=1) if shift.crosses_midnight else work_date
        out_dt = datetime.combine(out_date, requested_out_time, tzinfo=LOCAL_TZ).astimezone(UTC)
        synthetic_punches.append(
            AttendanceLog(
                employee_id=employee.id, punch_time_utc=out_dt,
                source=AttendanceSource.WEB, direction_hint=DirectionHint.OUT,
            )
        )

    computed = compute_daily(
        employee, work_date, synthetic_punches, shift, weekly_offs, holiday, approved_leave
    )
    computed.is_manual_override = True
    computed.override_reason = reason
    computed.override_by = approver_id

    return await _upsert_daily(db, employee, work_date, computed, force=True)
