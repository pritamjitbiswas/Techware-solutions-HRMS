from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import EmploymentStatus, EmploymentType, WorkLocation


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- Admin/HR-managed (section 4.1) ---
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    official_email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    designation_id: Mapped[int | None] = mapped_column(ForeignKey("designations.id"), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    reporting_manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(EmploymentType, name="employment_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("shifts.id"), nullable=True)
    work_location: Mapped[WorkLocation] = mapped_column(
        Enum(WorkLocation, name="work_location", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    employment_status: Mapped[EmploymentStatus] = mapped_column(
        Enum(EmploymentStatus, name="employment_status", values_callable=lambda x: [e.value for e in x]),
        default=EmploymentStatus.ACTIVE,
        nullable=False,
    )
    date_of_exit: Mapped[date | None] = mapped_column(Date, nullable=True)

    # --- Employee self-service (section 4.2) ---
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    personal_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    current_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    permanent_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    emergency_contact_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    emergency_contact_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)
    profile_picture_key: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
