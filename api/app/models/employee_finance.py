from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class EmployeeFinance(Base):
    """HR/ADMIN-only finance data. Kept off the employees table on purpose (section 4.1)."""

    __tablename__ = "employee_finance"

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), primary_key=True)
    ctc_annual: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(10), nullable=True)
    pf_uan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    bank_ifsc: Mapped[str | None] = mapped_column(String(11), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
