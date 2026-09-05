from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import HalfDaySession, LeaveRequestStatus


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False)
    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_half_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    half_day_session: Mapped[HalfDaySession | None] = mapped_column(
        Enum(HalfDaySession, name="half_day_session", values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    total_days: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[LeaveRequestStatus] = mapped_column(
        Enum(LeaveRequestStatus, name="leave_request_status", values_callable=lambda x: [e.value for e in x]),
        default=LeaveRequestStatus.PENDING,
        nullable=False,
    )
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approver_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
