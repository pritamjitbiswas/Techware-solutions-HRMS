from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LeaveBalance


async def get_or_create_balance(
    db: AsyncSession, employee_id: int, leave_type_id: int, year: int
) -> LeaveBalance:
    existing = (
        await db.execute(
            select(LeaveBalance).where(
                LeaveBalance.employee_id == employee_id,
                LeaveBalance.leave_type_id == leave_type_id,
                LeaveBalance.year == year,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    balance = LeaveBalance(
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        year=year,
        opening=Decimal("0"),
        accrued=Decimal("0"),
        used=Decimal("0"),
        pending=Decimal("0"),
        closing=Decimal("0"),
    )
    db.add(balance)
    await db.flush()
    return balance


def _recompute_closing(balance: LeaveBalance) -> None:
    balance.closing = balance.opening + balance.accrued - balance.used - balance.pending


async def hold_pending(
    db: AsyncSession, employee_id: int, leave_type_id: int, year: int, days: Decimal
) -> None:
    balance = await get_or_create_balance(db, employee_id, leave_type_id, year)
    balance.pending += days
    _recompute_closing(balance)
    await db.flush()


async def release_pending(
    db: AsyncSession, employee_id: int, leave_type_id: int, year: int, days: Decimal
) -> None:
    balance = await get_or_create_balance(db, employee_id, leave_type_id, year)
    balance.pending = max(Decimal("0"), balance.pending - days)
    _recompute_closing(balance)
    await db.flush()


async def convert_pending_to_used(
    db: AsyncSession, employee_id: int, leave_type_id: int, year: int, days: Decimal
) -> None:
    balance = await get_or_create_balance(db, employee_id, leave_type_id, year)
    balance.pending = max(Decimal("0"), balance.pending - days)
    balance.used += days
    _recompute_closing(balance)
    await db.flush()
