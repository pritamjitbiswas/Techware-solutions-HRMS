from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.attendance_compute import MissingShiftError
from app.core.deps import get_current_employee, get_current_user
from app.db import get_db
from app.models import Employee, RegularisationRequest, User
from app.models.enums import RegularisationStatus, UserRole
from app.schemas.regularisation import RegularisationActionIn, RegularisationIn, RegularisationOut
from app.services.attendance import apply_regularisation_override
from app.services.employee_brief import to_employee_brief

router = APIRouter(prefix="/regularisations", tags=["regularisations"])


async def _to_out(
    db: AsyncSession, request: RegularisationRequest, *, with_employee: bool
) -> RegularisationOut:
    employee_brief = None
    if with_employee:
        employee = (
            await db.execute(select(Employee).where(Employee.id == request.employee_id))
        ).scalar_one_or_none()
        if employee is not None:
            employee_brief = await to_employee_brief(employee)

    return RegularisationOut(
        id=request.id,
        employee_id=request.employee_id,
        work_date=request.work_date,
        requested_in_time=request.requested_in_time,
        requested_out_time=request.requested_out_time,
        reason=request.reason,
        status=request.status,
        approver_id=request.approver_id,
        approver_comment=request.approver_comment,
        applied_at=request.applied_at,
        actioned_at=request.actioned_at,
        employee=employee_brief,
    )


@router.post("", response_model=RegularisationOut, status_code=status.HTTP_201_CREATED)
async def create_regularisation(
    payload: RegularisationIn,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    if payload.requested_in_time is None and payload.requested_out_time is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide at least one of in/out time")

    request = RegularisationRequest(
        employee_id=employee.id,
        work_date=payload.work_date,
        requested_in_time=payload.requested_in_time,
        requested_out_time=payload.requested_out_time,
        reason=payload.reason,
        status=RegularisationStatus.PENDING,
        applied_at=datetime.now(UTC),
    )
    db.add(request)
    await db.commit()
    await db.refresh(request)
    return await _to_out(db, request, with_employee=False)


@router.get("", response_model=list[RegularisationOut])
async def list_regularisations(
    status_filter: RegularisationStatus | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RegularisationRequest)
    if current_user.role == UserRole.EMPLOYEE:
        stmt = stmt.where(RegularisationRequest.employee_id == current_user.employee_id)
    elif current_user.role == UserRole.MANAGER:
        stmt = stmt.join(Employee, Employee.id == RegularisationRequest.employee_id).where(
            Employee.reporting_manager_id == current_user.employee_id
        )
    if status_filter is not None:
        stmt = stmt.where(RegularisationRequest.status == status_filter)
    stmt = stmt.order_by(RegularisationRequest.applied_at.desc())
    requests = (await db.execute(stmt)).scalars().all()
    return [await _to_out(db, r, with_employee=True) for r in requests]


async def _get_and_authorize(db: AsyncSession, request_id: int, current_user: User) -> RegularisationRequest:
    request = (
        await db.execute(select(RegularisationRequest).where(RegularisationRequest.id == request_id))
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Regularisation request not found")

    if current_user.role in (UserRole.HR, UserRole.ADMIN):
        return request
    if current_user.role == UserRole.MANAGER:
        target = (
            await db.execute(select(Employee).where(Employee.id == request.employee_id))
        ).scalar_one_or_none()
        if target is not None and target.reporting_manager_id == current_user.employee_id:
            return request

    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized to act on this request")


@router.post("/{request_id}/approve", response_model=RegularisationOut)
async def approve_regularisation(
    request_id: int,
    payload: RegularisationActionIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await _get_and_authorize(db, request_id, current_user)
    if request.status != RegularisationStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request already actioned")

    employee = (
        await db.execute(select(Employee).where(Employee.id == request.employee_id))
    ).scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    try:
        await apply_regularisation_override(
            db,
            employee,
            request.work_date,
            request.requested_in_time,
            request.requested_out_time,
            request.reason,
            current_user.id,
        )
    except MissingShiftError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    request.status = RegularisationStatus.APPROVED
    request.approver_id = current_user.id
    request.approver_comment = payload.comment
    request.actioned_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(request)
    return await _to_out(db, request, with_employee=False)


@router.post("/{request_id}/reject", response_model=RegularisationOut)
async def reject_regularisation(
    request_id: int,
    payload: RegularisationActionIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    request = await _get_and_authorize(db, request_id, current_user)
    if request.status != RegularisationStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request already actioned")

    request.status = RegularisationStatus.REJECTED
    request.approver_id = current_user.id
    request.approver_comment = payload.comment
    request.actioned_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(request)
    return await _to_out(db, request, with_employee=False)
