from app.core.storage import presigned_url
from app.models import Employee
from app.schemas.leave import EmployeeBrief


async def to_employee_brief(employee: Employee) -> EmployeeBrief:
    profile_picture_url = None
    if employee.profile_picture_key:
        profile_picture_url = await presigned_url(employee.profile_picture_key)
    return EmployeeBrief(
        id=employee.id,
        full_name=employee.full_name,
        employee_code=employee.employee_code,
        profile_picture_url=profile_picture_url,
    )
