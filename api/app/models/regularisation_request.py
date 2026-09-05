from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import RegularisationStatus


class RegularisationRequest(Base):
    __tablename__ = "regularisation_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    requested_in_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    requested_out_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[RegularisationStatus] = mapped_column(
        Enum(
            RegularisationStatus,
            name="regularisation_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        default=RegularisationStatus.PENDING,
        nullable=False,
    )
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approver_comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
