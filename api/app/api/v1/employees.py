import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import Integer, cast, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import model_to_dict, record_audit
from app.core.deps import get_current_user, require_role
from app.core.security import hash_password
from app.core.storage import presigned_url
from app.db import get_db
from app.models import Employee, EmployeeFinance, User
from app.models.enums import EmploymentStatus, UserRole
from app.schemas.employee import (
    EmployeeAdminUpdate,
    EmployeeCreate,
    EmployeeCreateResponse,
    EmployeeFinanceIn,
    EmployeeFinanceOut,
    EmployeeOut,
    EmployeeResetPasswordRequest,
)

router = APIRouter(prefix="/employees", tags=["employees"])

EMPLOYEE_CODE_PREFIX = "ACT-"
MAX_CODE_ATTEMPTS = 3


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


async def _next_employee_code(db: AsyncSession) -> str:
    stmt = select(
        func.max(cast(func.substr(Employee.employee_code, len(EMPLOYEE_CODE_PREFIX) + 1), Integer))
    ).where(Employee.employee_code.like(f"{EMPLOYEE_CODE_PREFIX}%"))
    current_max = (await db.execute(stmt)).scalar() or 0
    return f"{EMPLOYEE_CODE_PREFIX}{current_max + 1:04d}"


async def _get_employee_and_user(db: AsyncSession, employee_id: int) -> tuple[Employee, User]:
    employee = (await db.execute(select(Employee).where(Employee.id == employee_id))).scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    user = (
        await db.execute(select(User).where(User.employee_id == employee_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User account not found for employee")
    return employee, user


@router.post(
    "",
    response_model=EmployeeCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_employee(
    payload: EmployeeCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    temp_password = secrets.token_urlsafe(9)

    for attempt in range(MAX_CODE_ATTEMPTS):
        employee_code = await _next_employee_code(db)
        employee = Employee(
            employee_code=employee_code,
            full_name=payload.full_name,
            official_email=payload.official_email,
            date_of_joining=payload.date_of_joining,
            designation_id=payload.designation_id,
            department_id=payload.department_id,
            reporting_manager_id=payload.reporting_manager_id,
            employment_type=payload.employment_type,
            shift_id=payload.shift_id,
            work_location=payload.work_location,
            employment_status=EmploymentStatus.ACTIVE,
        )
        db.add(employee)
        try:
            await db.flush()
        except IntegrityError as exc:
            await db.rollback()
            if "employee_code" in str(exc.orig) and attempt < MAX_CODE_ATTEMPTS - 1:
                continue
            raise HTTPException(
                status.HTTP_409_CONFLICT, "Employee could not be created (duplicate value)"
            ) from exc
        break

    user = User(
        employee_id=employee.id,
        password_hash=hash_password(temp_password),
        role=payload.role,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)

    if payload.finance is not None:
        db.add(
            EmployeeFinance(
                employee_id=employee.id, **payload.finance.model_dump(), updated_by=current_user.id
            )
        )

    await db.flush()
    await db.refresh(employee)
    await record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="employee",
        entity_id=employee.id,
        action="create",
        before=None,
        after=model_to_dict(employee),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    await db.refresh(employee)

    return EmployeeCreateResponse(
        employee=await _to_employee_out(employee, user), temporary_password=temp_password
    )


@router.get(
    "",
    response_model=list[EmployeeOut],
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.HR, UserRole.ADMIN))],
)
async def list_employees(
    department: int | None = None,
    status_filter: EmploymentStatus | None = Query(None, alias="status"),
    q: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Employee, User).join(User, User.employee_id == Employee.id)

    if department is not None:
        stmt = stmt.where(Employee.department_id == department)
    if status_filter is not None:
        stmt = stmt.where(Employee.employment_status == status_filter)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Employee.full_name.ilike(like),
                Employee.employee_code.ilike(like),
                Employee.official_email.ilike(like),
            )
        )

    stmt = stmt.order_by(Employee.id).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    return [await _to_employee_out(employee, user) for employee, user in rows]


@router.get(
    "/{employee_id}",
    response_model=EmployeeOut,
    dependencies=[Depends(require_role(UserRole.MANAGER, UserRole.HR, UserRole.ADMIN))],
)
async def get_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    employee, user = await _get_employee_and_user(db, employee_id)
    return await _to_employee_out(employee, user)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeOut,
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def update_employee(
    employee_id: int,
    payload: EmployeeAdminUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    employee, user = await _get_employee_and_user(db, employee_id)

    changes = payload.model_dump(exclude_unset=True)
    role_or_status_change = "role" in changes or "is_active" in changes
    if role_or_status_change and current_user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only ADMIN can change role or account status")

    before = model_to_dict(employee)

    if "role" in changes:
        user.role = changes.pop("role")
    if "is_active" in changes:
        user.is_active = changes.pop("is_active")

    for field, value in changes.items():
        setattr(employee, field, value)

    await db.flush()
    await db.refresh(employee)
    await record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="employee",
        entity_id=employee.id,
        action="update",
        before=before,
        after=model_to_dict(employee),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return await _to_employee_out(employee, user)


@router.get(
    "/{employee_id}/finance",
    response_model=EmployeeFinanceOut,
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def get_employee_finance(employee_id: int, db: AsyncSession = Depends(get_db)):
    finance = (
        await db.execute(select(EmployeeFinance).where(EmployeeFinance.employee_id == employee_id))
    ).scalar_one_or_none()
    if finance is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Finance record not found")
    return finance


@router.patch(
    "/{employee_id}/finance",
    response_model=EmployeeFinanceOut,
    dependencies=[Depends(require_role(UserRole.HR, UserRole.ADMIN))],
)
async def update_employee_finance(
    employee_id: int,
    payload: EmployeeFinanceIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    finance = (
        await db.execute(select(EmployeeFinance).where(EmployeeFinance.employee_id == employee_id))
    ).scalar_one_or_none()

    before = None
    if finance is None:
        employee, _ = await _get_employee_and_user(db, employee_id)
        finance = EmployeeFinance(employee_id=employee.id)
        db.add(finance)
    else:
        before = model_to_dict(finance)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(finance, field, value)
    finance.updated_by = current_user.id

    await db.flush()
    await db.refresh(finance)
    await record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="employee_finance",
        entity_id=employee_id,
        action="update",
        before=before,
        after=model_to_dict(finance),
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return finance


@router.post(
    "/{employee_id}/reset-password",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def admin_reset_password(
    employee_id: int,
    payload: EmployeeResetPasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    employee = (
        await db.execute(select(Employee).where(Employee.id == employee_id))
    ).scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")

    user = (
        await db.execute(select(User).where(User.employee_id == employee_id))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User account not found for this employee")

    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = payload.must_change_password
    await record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="user",
        entity_id=user.id,
        action="admin_reset_password",
        before={"employee_id": employee_id},
        after={"employee_id": employee_id, "must_change_password": payload.must_change_password},
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"message": f"Password for {employee.full_name} updated successfully."}

