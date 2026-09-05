from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AttendanceSource, AttendanceStatus, DirectionHint


class PunchGeoIn(BaseModel):
    latitude: float
    longitude: float
    accuracy_metres: float | None = None
    is_mock_location: bool | None = None


class PunchIn(BaseModel):
    client_punch_id: str
    source: AttendanceSource
    direction_hint: DirectionHint
    geo: PunchGeoIn | None = None


class PunchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    punch_time_utc: datetime
    source: AttendanceSource
    direction_hint: DirectionHint
    latitude: float | None
    longitude: float | None
    accuracy_metres: float | None
    is_mock_location: bool | None
    geo_flag: str | None = None


class AttendanceDailyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    work_date: date
    shift_id: int | None
    first_in_utc: datetime | None
    last_out_utc: datetime | None
    worked_minutes: int
    break_minutes: int
    overtime_minutes: int
    late_by_minutes: int
    early_out_minutes: int
    status: AttendanceStatus
    is_manual_override: bool
    override_reason: str | None
    override_by: int | None
    computed_at: datetime


class AttendanceOverrideIn(BaseModel):
    reason: str
    first_in_utc: datetime | None = None
    last_out_utc: datetime | None = None
    status: AttendanceStatus | None = None
