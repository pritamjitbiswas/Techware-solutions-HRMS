import io
from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db import get_db
from app.models import AttendanceDaily, Department, Employee
from app.models.enums import AttendanceStatus, UserRole
from app.schemas.reports import AttendanceSummaryRow

router = APIRouter(prefix="/reports", tags=["reports"])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
SUMMARY_HEADERS = [
    "Employee Code", "Name", "Department", "Present", "Half Day", "Absent",
    "On Leave", "Holiday", "Weekly Off", "Pending", "Worked (min)", "Overtime (min)", "Late (min)",
]


def _parse_month(month: str) -> tuple[date, date]:
    year_str, month_str = month.split("-")
    year, month_num = int(year_str), int(month_str)
    _, last_day = monthrange(year, month_num)
    return date(year, month_num, 1), date(year, month_num, last_day)


def _row_to_xlsx_line(row: AttendanceSummaryRow) -> list:
    return [
        row.employee_code, row.full_name, row.department_name or "",
        row.present, row.half_day, row.absent, row.on_leave, row.holiday,
        row.weekly_off, row.pending, row.worked_minutes, row.overtime_minutes, row.late_by_minutes,
    ]


def _to_xlsx_response(rows: list[AttendanceSummaryRow], month: str) -> StreamingResponse:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Attendance Summary"
    sheet.append(SUMMARY_HEADERS)
    for row in rows:
        sheet.append(_row_to_xlsx_line(row))

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    filename = f"attendance-summary-{month}.xlsx"
    return StreamingResponse(
        buffer,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/attendance-summary",
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def attendance_summary(
    month: str = Query(..., description="YYYY-MM"),
    department: int | None = None,
    export_format: str = Query("json", alias="format", pattern="^(json|xlsx)$"),
    db: AsyncSession = Depends(get_db),
):
    from_date, to_date = _parse_month(month)

    employee_stmt = select(Employee, Department.name).outerjoin(
        Department, Department.id == Employee.department_id
    )
    if department is not None:
        employee_stmt = employee_stmt.where(Employee.department_id == department)
    employees = (await db.execute(employee_stmt)).all()

    daily_stmt = select(AttendanceDaily).where(
        AttendanceDaily.work_date >= from_date, AttendanceDaily.work_date <= to_date
    )
    if department is not None:
        daily_stmt = daily_stmt.join(Employee, Employee.id == AttendanceDaily.employee_id).where(
            Employee.department_id == department
        )
    daily_rows = (await db.execute(daily_stmt)).scalars().all()

    by_employee: dict[int, list[AttendanceDaily]] = {}
    for row in daily_rows:
        by_employee.setdefault(row.employee_id, []).append(row)

    summary_rows = []
    for employee, department_name in employees:
        rows = by_employee.get(employee.id, [])
        summary_rows.append(
            AttendanceSummaryRow(
                employee_id=employee.id,
                employee_code=employee.employee_code,
                full_name=employee.full_name,
                department_name=department_name,
                present=sum(1 for r in rows if r.status == AttendanceStatus.PRESENT),
                half_day=sum(1 for r in rows if r.status == AttendanceStatus.HALF_DAY),
                absent=sum(1 for r in rows if r.status == AttendanceStatus.ABSENT),
                on_leave=sum(1 for r in rows if r.status == AttendanceStatus.ON_LEAVE),
                holiday=sum(1 for r in rows if r.status == AttendanceStatus.HOLIDAY),
                weekly_off=sum(1 for r in rows if r.status == AttendanceStatus.WEEKLY_OFF),
                pending=sum(1 for r in rows if r.status == AttendanceStatus.PENDING),
                worked_minutes=sum(r.worked_minutes for r in rows),
                overtime_minutes=sum(r.overtime_minutes for r in rows),
                late_by_minutes=sum(r.late_by_minutes for r in rows),
            )
        )

    if export_format == "xlsx":
        return _to_xlsx_response(summary_rows, month)
    return summary_rows
