from sqlalchemy import ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_leave_balance_employee_type_year"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    leave_type_id: Mapped[int] = mapped_column(ForeignKey("leave_types.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    opening: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    accrued: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    used: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    pending: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
    closing: Mapped[float] = mapped_column(Numeric(6, 2), default=0, nullable=False)
