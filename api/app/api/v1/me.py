import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_employee, get_current_user
from app.core.images import MAX_UPLOAD_BYTES, process_profile_picture, sniff_image_type
from app.core.storage import presigned_url, put_object, thumb_key
from app.db import get_db
from app.models import AttendanceDaily, Employee, LeaveBalance, LeaveType, User
from app.schemas.attendance import AttendanceDailyOut
from app.schemas.employee import EmployeeOut, EmployeeSelfUpdate
from app.schemas.leave import LeaveBalanceOut

router = APIRouter(prefix="/me", tags=["me"])


async def _to_employee_out(employee: Employee, user: User) -> EmployeeOut:
    profile_picture_url = None
    if employee.profile_picture_key:
        profile_picture_url = await presigned_url(employee.profile_picture_key)

    return EmployeeOut(
        **{c.name: getattr(employee, c.name) for c in Employee.__table__.columns},
        role=user.role,
        is_active=user.is_active,
        profile_picture_url=profile_picture_url,
    )


@router.get("", response_model=EmployeeOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    employee: Employee = Depends(get_current_employee),
):
    return await _to_employee_out(employee, current_user)


@router.patch("", response_model=EmployeeOut)
async def update_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    raw = await request.json()
    allowed_fields = set(EmployeeSelfUpdate.model_fields.keys())
    disallowed = set(raw.keys()) - allowed_fields
    if disallowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Cannot edit admin-managed field(s): {', '.join(sorted(disallowed))}",
        )

    payload = EmployeeSelfUpdate(**raw)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)

    await db.commit()
    await db.refresh(employee)
    return await _to_employee_out(employee, current_user)


@router.get("/attendance", response_model=list[AttendanceDailyOut])
async def get_my_attendance(
    from_: date = Query(..., alias="from"),
    to: date = Query(...),
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(AttendanceDaily)
        .where(
            AttendanceDaily.employee_id == employee.id,
            AttendanceDaily.work_date >= from_,
            AttendanceDaily.work_date <= to,
        )
        .order_by(AttendanceDaily.work_date)
    )
    return (await db.execute(stmt)).scalars().all()


@router.get("/leave-balance", response_model=list[LeaveBalanceOut])
async def get_my_leave_balance(
    year: int = Query(default_factory=lambda: date.today().year),
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(LeaveBalance, LeaveType)
        .join(LeaveType, LeaveType.id == LeaveBalance.leave_type_id)
        .where(LeaveBalance.employee_id == employee.id, LeaveBalance.year == year)
        .order_by(LeaveType.id)
    )
    rows = (await db.execute(stmt)).all()
    return [
        LeaveBalanceOut(
            id=balance.id,
            employee_id=balance.employee_id,
            leave_type_id=balance.leave_type_id,
            year=balance.year,
            opening=balance.opening,
            accrued=balance.accrued,
            used=balance.used,
            pending=balance.pending,
            closing=balance.closing,
            leave_type=leave_type,
        )
        for balance, leave_type in rows
    ]


@router.post("/profile-picture", response_model=EmployeeOut)
async def upload_profile_picture(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File exceeds 5MB limit")

    if sniff_image_type(data) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Only JPEG, PNG or WebP images are allowed")

    try:
        large_bytes, small_bytes = process_profile_picture(data)
    except Exception as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Could not process image") from exc

    key = f"employees/{employee.id}/profile/{uuid.uuid4()}.jpg"
    await put_object(key, large_bytes, "image/jpeg")
    await put_object(thumb_key(key), small_bytes, "image/jpeg")

    employee.profile_picture_key = key
    await db.commit()
    await db.refresh(employee)
    return await _to_employee_out(employee, current_user)

