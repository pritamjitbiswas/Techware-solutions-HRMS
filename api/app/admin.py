from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from sqlalchemy import select
from starlette.requests import Request

from app.config import settings
from app.core.security import verify_password
from app.db import async_session_factory
from app.models import (
    AttendanceDaily,
    AttendanceLog,
    AuditLog,
    Department,
    Designation,
    Employee,
    EmployeeFinance,
    Holiday,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    RefreshToken,
    RegularisationRequest,
    Shift,
    User,
    WeeklyOff,
)
from app.models.enums import UserRole


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username")
        password = form.get("password")
        if not email or not password:
            return False

        async with async_session_factory() as session:
            stmt = (
                select(User)
                .join(Employee, Employee.id == User.employee_id)
                .where(Employee.official_email == email)
            )
            user = (await session.execute(stmt)).scalar_one_or_none()
            if (
                user is None
                or not user.is_active
                or user.role != UserRole.ADMIN
                or not verify_password(password, user.password_hash)
            ):
                return False

        request.session["admin_user_id"] = user.id
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        user_id = request.session.get("admin_user_id")
        if user_id is None:
            return False

        async with async_session_factory() as session:
            user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
            return user is not None and user.is_active and user.role == UserRole.ADMIN


class EmployeeAdminView(ModelView, model=Employee):
    """Employees are never hard-deleted (spec 5, rule 4) — offboard via employment_status='exited' instead."""

    name_plural = "Employees"
    column_list = [
        Employee.id,
        Employee.employee_code,
        Employee.full_name,
        Employee.official_email,
        Employee.department_id,
        Employee.employment_status,
    ]
    can_delete = False


class EmployeeFinanceAdminView(ModelView, model=EmployeeFinance):
    name_plural = "Employee Finance"


class UserAdminView(ModelView, model=User):
    """1:1 with an employee — deleting it would orphan the employee record it belongs to."""

    name_plural = "Users"
    column_list = [User.id, User.employee_id, User.role, User.is_active, User.must_change_password]
    form_excluded_columns = [User.password_hash]
    can_delete = False


class DepartmentAdminView(ModelView, model=Department):
    name_plural = "Departments"


class DesignationAdminView(ModelView, model=Designation):
    name_plural = "Designations"


class ShiftAdminView(ModelView, model=Shift):
    name_plural = "Shifts"


class WeeklyOffAdminView(ModelView, model=WeeklyOff):
    name_plural = "Weekly Offs"


class HolidayAdminView(ModelView, model=Holiday):
    name_plural = "Holidays"


class LeaveTypeAdminView(ModelView, model=LeaveType):
    name_plural = "Leave Types"


class LeaveBalanceAdminView(ModelView, model=LeaveBalance):
    name_plural = "Leave Balances"


class LeaveRequestAdminView(ModelView, model=LeaveRequest):
    name_plural = "Leave Requests"


class RegularisationRequestAdminView(ModelView, model=RegularisationRequest):
    name_plural = "Regularisation Requests"


class RefreshTokenAdminView(ModelView, model=RefreshToken):
    name_plural = "Refresh Tokens"
    column_list = [RefreshToken.id, RefreshToken.user_id, RefreshToken.expires_at, RefreshToken.revoked_at]
    form_excluded_columns = [RefreshToken.token_hash]
    can_create = False
    can_edit = False


class AttendanceLogAdminView(ModelView, model=AttendanceLog):
    """attendance_logs is append-only (spec 5.1) — no edits or deletes even from the escape hatch."""

    name_plural = "Attendance Logs"
    can_create = False
    can_edit = False
    can_delete = False


class AttendanceDailyAdminView(ModelView, model=AttendanceDaily):
    """Fully derived (spec 5.2) — corrections go through the override endpoint, not here."""

    name_plural = "Attendance Daily"
    can_create = False
    can_edit = False
    can_delete = False


class AuditLogAdminView(ModelView, model=AuditLog):
    """An audit trail must not be editable, or it stops being trustworthy."""

    name_plural = "Audit Log"
    can_create = False
    can_edit = False
    can_delete = False


def register_admin(app, engine) -> Admin:
    admin = Admin(app, engine, authentication_backend=AdminAuth(secret_key=settings.jwt_secret_key))

    for view in (
        EmployeeAdminView,
        EmployeeFinanceAdminView,
        UserAdminView,
        DepartmentAdminView,
        DesignationAdminView,
        ShiftAdminView,
        WeeklyOffAdminView,
        HolidayAdminView,
        LeaveTypeAdminView,
        LeaveBalanceAdminView,
        LeaveRequestAdminView,
        RegularisationRequestAdminView,
        RefreshTokenAdminView,
        AttendanceLogAdminView,
        AttendanceDailyAdminView,
        AuditLogAdminView,
    ):
        admin.add_view(view)

    return admin
