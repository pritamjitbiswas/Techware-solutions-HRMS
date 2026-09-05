import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.models import AuditLog


def model_to_dict(instance: DeclarativeBase) -> dict:
    result = {}
    for column in instance.__table__.columns:
        value = getattr(instance, column.name)
        if isinstance(value, enum.Enum):
            value = value.value
        elif isinstance(value, Decimal):
            value = str(value)
        elif isinstance(value, datetime | date):
            value = value.isoformat()
        result[column.name] = value
    return result


async def record_audit(
    session: AsyncSession,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int,
    action: str,
    before: dict | None,
    after: dict | None,
    ip_address: str | None,
) -> None:
    session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=before,
            after_json=after,
            ip_address=ip_address,
        )
    )
