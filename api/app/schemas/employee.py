from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EmploymentStatus, EmploymentType, UserRole, WorkLocation
from app.schemas.common import EmailField


class EmployeeFinanceIn(BaseModel):
    ctc_annual: Decimal | None = None
    pan_number: str | None = None
    pf_uan: str | None = None
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    bank_name: str | None = None


class EmployeeFinanceOut(EmployeeFinanceIn):
    model_config = ConfigDict(from_attributes=True)

    employee_id: int
    updated_by: int | None
    updated_at: datetime


class EmployeeCreate(BaseModel):
    full_name: str
    official_email: EmailField
    date_of_joining: date
    designation_id: int | None = None
    department_id: int | None = None
    reporting_manager_id: int | None = None
    employment_type: EmploymentType
    shift_id: int | None = None
    work_location: WorkLocation
    role: UserRole
    finance: EmployeeFinanceIn | None = None


class EmployeeAdminUpdate(BaseModel):
    """Admin/HR-managed fields (spec 4.1). All optional — PATCH semantics."""

    full_name: str | None = None
    official_email: EmailField | None = None
    date_of_joining: date | None = None
    designation_id: int | None = None
    department_id: int | None = None
    reporting_manager_id: int | None = None
    employment_type: EmploymentType | None = None
    shift_id: int | None = None
    work_location: WorkLocation | None = None
    employment_status: EmploymentStatus | None = None
    date_of_exit: date | None = None

    # ADMIN-only (checked in the route, not here — HR may not set these)
    role: UserRole | None = None
    is_active: bool | None = None


class EmployeeSelfUpdate(BaseModel):
    """Employee self-service fields (spec 4.2). All optional — PATCH semantics."""

    date_of_birth: date | None = None
    personal_mobile: str | None = None
    personal_email: EmailField | None = None
    current_address: str | None = None
    permanent_address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_number: str | None = None
    emergency_contact_relation: str | None = None
    blood_group: str | None = None


class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    full_name: str
    official_email: str
    date_of_joining: date
    designation_id: int | None
    department_id: int | None
    reporting_manager_id: int | None
    employment_type: EmploymentType
    shift_id: int | None
    work_location: WorkLocation
    employment_status: EmploymentStatus
    date_of_exit: date | None

    date_of_birth: date | None
    personal_mobile: str | None
    personal_email: str | None
    current_address: str | None
    permanent_address: str | None
    emergency_contact_name: str | None
    emergency_contact_number: str | None
    emergency_contact_relation: str | None
    blood_group: str | None
    profile_picture_url: str | None = None

    role: UserRole
    is_active: bool

    created_at: datetime
    updated_at: datetime


class EmployeeCreateResponse(BaseModel):
    employee: EmployeeOut
    temporary_password: str


class EmployeeResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6)
    must_change_password: bool = False

