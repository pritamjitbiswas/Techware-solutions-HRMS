from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import HalfDaySession, LeaveAccrual, LeaveRequestStatus


class LeaveTypeIn(BaseModel):
    name: str
    code: str
    annual_quota: int
    accrual: LeaveAccrual
    carry_forward_max: int = 0
    is_paid: bool = True
    requires_document: bool = False


class LeaveTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    annual_quota: int
    accrual: LeaveAccrual
    carry_forward_max: int
    is_paid: bool
    requires_document: bool
    is_active: bool


class LeaveBalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type_id: int
    year: int
    opening: Decimal
    accrued: Decimal
    used: Decimal
    pending: Decimal
    closing: Decimal
    leave_type: LeaveTypeOut | None = None


class LeaveRequestIn(BaseModel):
    leave_type_id: int
    from_date: date
    to_date: date
    is_half_day: bool = False
    half_day_session: HalfDaySession | None = None
    reason: str


class LeaveActionIn(BaseModel):
    comment: str | None = None


class EmployeeBrief(BaseModel):
    id: int
    full_name: str
    employee_code: str
    profile_picture_url: str | None = None


class LeaveRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    leave_type_id: int
    from_date: date
    to_date: date
    is_half_day: bool
    half_day_session: HalfDaySession | None
    total_days: Decimal
    reason: str | None
    status: LeaveRequestStatus
    approver_id: int | None
    approver_comment: str | None
    applied_at: datetime
    actioned_at: datetime | None
    leave_type: LeaveTypeOut | None = None
    employee: EmployeeBrief | None = None
