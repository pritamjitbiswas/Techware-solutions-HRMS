from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AttendanceSource, DirectionHint


class AttendanceLog(Base):
    """Append-only raw punches. Never UPDATE, never DELETE (section 5, rule 1)."""

    __tablename__ = "attendance_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    punch_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[AttendanceSource] = mapped_column(
        Enum(AttendanceSource, name="attendance_source", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    direction_hint: Mapped[DirectionHint] = mapped_column(
        Enum(DirectionHint, name="direction_hint", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy_metres: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_mock_location: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_punch_id: Mapped[str | None] = mapped_column(String(36), unique=True, nullable=True)
    server_received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
