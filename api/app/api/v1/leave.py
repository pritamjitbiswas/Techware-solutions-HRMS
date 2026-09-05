from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_employee, get_current_user, require_role
from app.db import get_db
from app.models import Employee, LeaveRequest, LeaveType, User
from app.models.enums import LeaveRequestStatus, UserRole
from app.schemas.leave import (
    LeaveActionIn,
    LeaveRequestIn,
    LeaveRequestOut,
    LeaveTypeIn,
    LeaveTypeOut,
)
from app.services.employee_brief import to_employee_brief
from app.services.leave_balance import convert_pending_to_used, hold_pending, release_pending

leave_types_router = APIRouter(prefix="/leave-types", tags=["leave"])
leave_router = APIRouter(prefix="/leave", tags=["leave"])


@leave_types_router.get("", response_model=list[LeaveTypeOut])
async def list_leave_types(db: AsyncSession = Depends(get_db)):
    stmt = select(LeaveType).where(LeaveType.is_active.is_(True)).order_by(LeaveType.id)
    return (await db.execute(stmt)).scalars().all()


@leave_types_router.post(
    "",
    response_model=LeaveTypeOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def create_leave_type(payload: LeaveTypeIn, db: AsyncSession = Depends(get_db)):
    leave_type = LeaveType(**payload.model_dump(), is_active=True)
    db.add(leave_type)
    await db.commit()
    await db.refresh(leave_type)
    return leave_type


@leave_types_router.patch(
    "/{leave_type_id}",
    response_model=LeaveTypeOut,
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def update_leave_type(leave_type_id: int, payload: LeaveTypeIn, db: AsyncSession = Depends(get_db)):
    leave_type = (
        await db.execute(select(LeaveType).where(LeaveType.id == leave_type_id))
    ).scalar_one_or_none()
    if leave_type is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave type not found")
    for field, value in payload.model_dump().items():
        setattr(leave_type, field, value)
    await db.commit()
    await db.refresh(leave_type)
    return leave_type


def _leave_total_days(payload: LeaveRequestIn) -> Decimal:
    if payload.to_date < payload.from_date:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "to_date cannot be before from_date")
    if payload.is_half_day:
        return Decimal("0.5")
    return Decimal((payload.to_date - payload.from_date).days + 1)


async def _to_leave_request_out(
    db: AsyncSession, request: LeaveRequest, *, with_employee: bool
) -> LeaveRequestOut:
    leave_type = (
        await db.execute(select(LeaveType).where(LeaveType.id == request.leave_type_id))
    ).scalar_one_or_none()
    employee_brief = None
    if with_employee:
        employee = (
            await db.execute(select(Employee).where(Employee.id == request.employee_id))
        ).scalar_one_or_none()
        if employee is not None:
            employee_brief = await to_employee_brief(employee)

    return LeaveRequestOut(
        id=request.id,
        employee_id=request.employee_id,
        leave_type_id=request.leave_type_id,
        from_date=request.from_date,
        to_date=request.to_date,
        is_half_day=request.is_half_day,
        half_day_session=request.half_day_session,
        total_days=request.total_days,
        reason=request.reason,
        status=request.status,
        approver_id=request.approver_id,
        approver_comment=request.approver_comment,
        applied_at=request.applied_at,
        actioned_at=request.actioned_at,
        leave_type=leave_type,
        employee=employee_brief,
    )


@leave_router.post("/requests", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
async def apply_for_leave(
    payload: LeaveRequestIn,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    leave_type = (
        await db.execute(select(LeaveType).where(LeaveType.id == payload.leave_type_id))
    ).scalar_one_or_none()
    if leave_type is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave type not found")

    total_days = _leave_total_days(payload)
    now = datetime.now(UTC)

    request = LeaveRequest(
        employee_id=employee.id,
        leave_type_id=payload.leave_type_id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        is_half_day=payload.is_half_day,
        half_day_session=payload.half_day_session,
        total_days=total_days,
        reason=payload.reason,
        status=LeaveRequestStatus.PENDING,
        applied_at=now,
    )
    db.add(request)
    await db.flush()

    await hold_pending(db, employee.id, leave_type.id, payload.from_date.year, total_days)
    await db.commit()
    await db.refresh(request)
    return await _to_leave_request_out(db, request, with_employee=False)


async def _visible_leave_requests_stmt(current_user: User):
    stmt = select(LeaveRequest)
    if current_user.role == UserRole.EMPLOYEE:
        stmt = stmt.where(LeaveRequest.employee_id == current_user.employee_id)
    elif current_user.role == UserRole.MANAGER:
        stmt = stmt.join(Employee, Employee.id == LeaveRequest.employee_id).where(
            Employee.reporting_manager_id == current_user.employee_id
        )
    return stmt


@leave_router.get("/requests", response_model=list[LeaveRequestOut])
async def list_leave_requests(
    status_filter: LeaveRequestStatus | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = await _visible_leave_requests_stmt(current_user)
    if status_filter is not None:
        stmt = stmt.where(LeaveRequest.status == status_filter)
    stmt = stmt.order_by(LeaveRequest.applied_at.desc())
    requests = (await db.execute(stmt)).scalars().all()
    return [await _to_leave_request_out(db, r, with_employee=True) for r in requests]


async def _get_request_and_authorize_action(
    db: AsyncSession, request_id: int, current_user: User, *, allow_requester: bool
) -> LeaveRequest:
    request = (
        await db.execute(select(LeaveRequest).where(LeaveRequest.id == request_id))
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave request not found")

    if allow_requester and request.employee_id == current_user.employee_id:
        return request
    if current_user.role in (UserRole.HR, UserRole.ADMIN):
        return request
    if current_user.role == UserRole.MANAGER:
        target = (
            await db.execute(select(Employee).where(Employee.id == request.employee_id))
        ).scalar_one_or_none()
        if target is not None and target.reporting_manager_id == current_user.employee_id:
            return request

    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to act on this request")


@leave_router.post("/requests/{request_id}/approve", response_model=LeaveRequestOut)
async def approve_leave(
    request_id: int,
    payload: LeaveActionIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await _get_request_and_authorize_action(db, request_id, current_user, allow_requester=False)
    if request.status != LeaveRequestStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request already actioned")

    request.status = LeaveRequestStatus.APPROVED
    request.approver_id = current_user.id
    request.approver_comment = payload.comment
    request.actioned_at = datetime.now(UTC)
    await convert_pending_to_used(
        db, request.employee_id, request.leave_type_id, request.from_date.year, request.total_days
    )
    await db.commit()
    await db.refresh(request)
    return await _to_leave_request_out(db, request, with_employee=False)


@leave_router.post("/requests/{request_id}/reject", response_model=LeaveRequestOut)
async def reject_leave(
    request_id: int,
    payload: LeaveActionIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await _get_request_and_authorize_action(db, request_id, current_user, allow_requester=False)
    if request.status != LeaveRequestStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request already actioned")

    request.status = LeaveRequestStatus.REJECTED
    request.approver_id = current_user.id
    request.approver_comment = payload.comment
    request.actioned_at = datetime.now(UTC)
    await release_pending(
        db, request.employee_id, request.leave_type_id, request.from_date.year, request.total_days
    )
    await db.commit()
    await db.refresh(request)
    return await _to_leave_request_out(db, request, with_employee=False)


@leave_router.post("/requests/{request_id}/cancel", response_model=LeaveRequestOut)
async def cancel_leave(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await _get_request_and_authorize_action(db, request_id, current_user, allow_requester=True)
    if request.status != LeaveRequestStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only a pending request can be cancelled")

    request.status = LeaveRequestStatus.CANCELLED
    request.actioned_at = datetime.now(UTC)
    await release_pending(
        db, request.employee_id, request.leave_type_id, request.from_date.year, request.total_days
    )
    await db.commit()
    await db.refresh(request)
    return await _to_leave_request_out(db, request, with_employee=False)
