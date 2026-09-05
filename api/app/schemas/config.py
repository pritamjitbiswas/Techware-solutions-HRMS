from datetime import time
from pydantic import BaseModel, ConfigDict


class DesignationCreate(BaseModel):
    title: str
    level: int | None = None
    is_active: bool = True


class DesignationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    level: int | None = None
    is_active: bool


class DepartmentCreate(BaseModel):
    name: str
    code: str
    is_active: bool = True


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    is_active: bool


class ShiftCreate(BaseModel):
    name: str
    start_time: time
    end_time: time
    grace_in_minutes: int = 15
    grace_out_minutes: int = 15
    break_minutes: int = 60
    full_day_minutes: int = 480
    half_day_minutes: int = 240
    crosses_midnight: bool = False
    is_active: bool = True


class ShiftUpdate(BaseModel):
    name: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    grace_in_minutes: int | None = None
    grace_out_minutes: int | None = None
    break_minutes: int | None = None
    full_day_minutes: int | None = None
    half_day_minutes: int | None = None
    crosses_midnight: bool | None = None
    is_active: bool | None = None


class ShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    start_time: time
    end_time: time
    grace_in_minutes: int
    grace_out_minutes: int
    break_minutes: int
    full_day_minutes: int
    half_day_minutes: int
    crosses_midnight: bool
    is_active: bool
