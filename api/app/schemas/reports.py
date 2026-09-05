from pydantic import BaseModel


class AttendanceSummaryRow(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    department_name: str | None
    present: int
    half_day: int
    absent: int
    on_leave: int
    holiday: int
    weekly_off: int
    pending: int
    worked_minutes: int
    overtime_minutes: int
    late_by_minutes: int
