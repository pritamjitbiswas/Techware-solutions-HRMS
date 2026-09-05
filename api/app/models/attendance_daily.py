from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import AttendanceStatus


class AttendanceDaily(Base):
    """Derived, fully recomputable from attendance_logs + shift + leave + holidays (section 5, rule 2)."""

    __tablename__ = "attendance_daily"
    __table_args__ = (UniqueConstraint("employee_id", "work_date", name="uq_attendance_daily_employee_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), nullable=True)
    first_in_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_out_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    worked_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overtime_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    late_by_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    early_out_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    override_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    override_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
