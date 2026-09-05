"""Pure attendance compute engine (spec section 7). No FastAPI/DB I/O here —
callers fetch rows and persist the result; this module only computes.
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.models import AttendanceDaily, AttendanceLog, Employee, Holiday, LeaveRequest, Shift
from app.models.enums import AttendanceStatus

LOCAL_TZ = ZoneInfo("Asia/Kolkata")
SHIFT_WINDOW_PADDING = timedelta(hours=4)


class MissingShiftError(ValueError):
    """Raised when an employee has no shift assigned — a clear error, not a crash (spec 7, rule 10)."""


def _shift_window(work_date: date, shift: Shift) -> tuple[datetime, datetime]:
    start_dt = datetime.combine(work_date, shift.start_time, tzinfo=LOCAL_TZ)
    end_date = work_date + timedelta(days=1) if shift.crosses_midnight else work_date
    end_dt = datetime.combine(end_date, shift.end_time, tzinfo=LOCAL_TZ)
    return start_dt - SHIFT_WINDOW_PADDING, end_dt + SHIFT_WINDOW_PADDING


def resolve_work_date_for_punch(punch_time_utc: datetime, shift: Shift) -> date:
    """Which shift-day a punch belongs to — by window membership, never naive calendar date."""
    local_time = punch_time_utc.astimezone(LOCAL_TZ)
    candidate = local_time.date()
    for offset in (0, -1, 1):
        work_date = candidate + timedelta(days=offset)
        window_start, window_end = _shift_window(work_date, shift)
        if window_start <= local_time < window_end:
            return work_date
    return candidate


def _empty_daily(
    employee: Employee, work_date: date, shift: Shift | None, status: AttendanceStatus
) -> AttendanceDaily:
    return AttendanceDaily(
        employee_id=employee.id,
        work_date=work_date,
        shift_id=shift.id if shift else None,
        first_in_utc=None,
        last_out_utc=None,
        worked_minutes=0,
        break_minutes=0,
        overtime_minutes=0,
        late_by_minutes=0,
        early_out_minutes=0,
        status=status,
        is_manual_override=False,
        override_reason=None,
        override_by=None,
    )


def compute_daily(
    employee: Employee,
    work_date: date,
    punches: list[AttendanceLog],
    shift: Shift | None,
    weekly_offs: set[int],
    holiday: Holiday | None,
    approved_leave: LeaveRequest | None,
) -> AttendanceDaily:
    if shift is None:
        raise MissingShiftError(f"Employee {employee.id} has no shift assigned for {work_date}")

    # Precedence: approved leave > holiday > weekly off > computed attendance.
    if approved_leave is not None:
        return _empty_daily(employee, work_date, shift, AttendanceStatus.ON_LEAVE)
    if holiday is not None:
        return _empty_daily(employee, work_date, shift, AttendanceStatus.HOLIDAY)
    # Python weekday(): Monday=0 .. Sunday=6, matching WeeklyOff.weekday in the seed script.
    if work_date.weekday() in weekly_offs:
        return _empty_daily(employee, work_date, shift, AttendanceStatus.WEEKLY_OFF)

    window_start, window_end = _shift_window(work_date, shift)
    in_window = [
        p for p in punches if window_start <= p.punch_time_utc.astimezone(LOCAL_TZ) < window_end
    ]
    in_window.sort(key=lambda p: p.punch_time_utc)

    if not in_window:
        return _empty_daily(employee, work_date, shift, AttendanceStatus.ABSENT)

    first_in = in_window[0].punch_time_utc
    last_out = in_window[-1].punch_time_utc

    if len(in_window) % 2 != 0:
        result = _empty_daily(employee, work_date, shift, AttendanceStatus.PENDING)
        result.first_in_utc = first_in
        result.last_out_utc = None
        return result

    elapsed_minutes = (last_out - first_in).total_seconds() / 60
    worked_minutes = max(0, round(elapsed_minutes - shift.break_minutes))
    overtime_minutes = max(0, worked_minutes - shift.full_day_minutes)

    if worked_minutes >= shift.full_day_minutes:
        status = AttendanceStatus.PRESENT
    elif worked_minutes >= shift.half_day_minutes:
        status = AttendanceStatus.HALF_DAY
    else:
        status = AttendanceStatus.ABSENT

    shift_start_local = datetime.combine(work_date, shift.start_time, tzinfo=LOCAL_TZ)
    grace_in_deadline = shift_start_local + timedelta(minutes=shift.grace_in_minutes)
    late_by_minutes = max(0, round((first_in.astimezone(LOCAL_TZ) - grace_in_deadline).total_seconds() / 60))

    shift_end_date = work_date + timedelta(days=1) if shift.crosses_midnight else work_date
    shift_end_local = datetime.combine(shift_end_date, shift.end_time, tzinfo=LOCAL_TZ)
    grace_out_deadline = shift_end_local - timedelta(minutes=shift.grace_out_minutes)
    early_out_delta = (grace_out_deadline - last_out.astimezone(LOCAL_TZ)).total_seconds() / 60
    early_out_minutes = max(0, round(early_out_delta))

    return AttendanceDaily(
        employee_id=employee.id,
        work_date=work_date,
        shift_id=shift.id,
        first_in_utc=first_in,
        last_out_utc=last_out,
        worked_minutes=worked_minutes,
        break_minutes=shift.break_minutes,
        overtime_minutes=overtime_minutes,
        late_by_minutes=late_by_minutes,
        early_out_minutes=early_out_minutes,
        status=status,
        is_manual_override=False,
        override_reason=None,
        override_by=None,
    )
