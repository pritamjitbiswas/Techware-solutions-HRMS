from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict

from app.models.enums import RegularisationStatus
from app.schemas.leave import EmployeeBrief


class RegularisationIn(BaseModel):
    work_date: date
    requested_in_time: time | None = None
    requested_out_time: time | None = None
    reason: str


class RegularisationActionIn(BaseModel):
    comment: str | None = None


class RegularisationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    work_date: date
    requested_in_time: time | None
    requested_out_time: time | None
    reason: str
    status: RegularisationStatus
    approver_id: int | None
    approver_comment: str | None
    applied_at: datetime
    actioned_at: datetime | None
    employee: EmployeeBrief | None = None
