from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db import get_db
from app.models import Department, Designation, Shift
from app.models.enums import UserRole
from app.schemas.config import (
    DepartmentCreate,
    DepartmentOut,
    DesignationCreate,
    DesignationOut,
    ShiftCreate,
    ShiftOut,
    ShiftUpdate,
)

designations_router = APIRouter(prefix="/designations", tags=["designations"])
departments_router = APIRouter(prefix="/departments", tags=["departments"])
shifts_router = APIRouter(prefix="/shifts", tags=["shifts"])


# --- DESIGNATIONS ---

@designations_router.get("", response_model=list[DesignationOut])
async def list_designations(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Designation).order_by(Designation.level.desc().nullslast(), Designation.title)
    return (await db.execute(stmt)).scalars().all()


@designations_router.post(
    "",
    response_model=DesignationOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_designation(
    payload: DesignationCreate,
    db: AsyncSession = Depends(get_db),
):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Title cannot be blank")

    stmt = select(Designation).where(Designation.title.ilike(title))
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Designation '{existing.title}' already exists",
        )

    desig = Designation(
        title=title,
        level=payload.level,
        is_active=payload.is_active,
    )
    db.add(desig)
    await db.commit()
    await db.refresh(desig)
    return desig


# --- DEPARTMENTS ---

@departments_router.get("", response_model=list[DepartmentOut])
async def list_departments(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Department).order_by(Department.name)
    return (await db.execute(stmt)).scalars().all()


@departments_router.post(
    "",
    response_model=DepartmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
):
    name = payload.name.strip()
    code = payload.code.strip().upper()
    if not name or not code:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Name and code are required")

    stmt = select(Department).where((Department.code == code) | (Department.name.ilike(name)))
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Department with name '{existing.name}' or code '{existing.code}' already exists",
        )

    dept = Department(
        name=name,
        code=code,
        is_active=payload.is_active,
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


# --- SHIFTS ---

@shifts_router.get("", response_model=list[ShiftOut])
async def list_shifts(
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Shift).order_by(Shift.id)
    return (await db.execute(stmt)).scalars().all()


@shifts_router.post(
    "",
    response_model=ShiftOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_shift(
    payload: ShiftCreate,
    db: AsyncSession = Depends(get_db),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Shift name is required")

    shift = Shift(
        name=name,
        start_time=payload.start_time,
        end_time=payload.end_time,
        grace_in_minutes=payload.grace_in_minutes,
        grace_out_minutes=payload.grace_out_minutes,
        break_minutes=payload.break_minutes,
        full_day_minutes=payload.full_day_minutes,
        half_day_minutes=payload.half_day_minutes,
        crosses_midnight=payload.crosses_midnight,
        is_active=payload.is_active,
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return shift


@shifts_router.patch(
    "/{shift_id}",
    response_model=ShiftOut,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def update_shift(
    shift_id: int,
    payload: ShiftUpdate,
    db: AsyncSession = Depends(get_db),
):
    shift = (await db.execute(select(Shift).where(Shift.id == shift_id))).scalar_one_or_none()
    if not shift:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(shift, field, val)

    await db.commit()
    await db.refresh(shift)
    return shift
