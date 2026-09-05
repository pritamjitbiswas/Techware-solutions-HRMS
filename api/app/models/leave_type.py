from sqlalchemy import Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import LeaveAccrual


class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    annual_quota: Mapped[int] = mapped_column(Integer, nullable=False)
    accrual: Mapped[LeaveAccrual] = mapped_column(
        Enum(LeaveAccrual, name="leave_accrual", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    carry_forward_max: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_document: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
