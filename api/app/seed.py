"""Idempotent local/dev seed data. Run with: python -m app.seed"""

import asyncio
import random
import uuid
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db import async_session_factory
from app.models import (
    AttendanceLog,
    Department,
    Designation,
    Employee,
    Holiday,
    LeaveType,
    Shift,
    User,
    WeeklyOff,
)
from app.models.enums import (
    AttendanceSource,
    DirectionHint,
    EmploymentStatus,
    EmploymentType,
    LeaveAccrual,
    UserRole,
    WorkLocation,
)

SEED_PASSWORD = "ChangeMe123!"
CURRENT_YEAR = date.today().year


async def get_or_create(session: AsyncSession, model, defaults: dict, **lookup):
    stmt = select(model).filter_by(**lookup)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        return existing, False
    obj = model(**lookup, **defaults)
    session.add(obj)
    await session.flush()
    return obj, True


async def seed_departments(session: AsyncSession) -> dict[str, Department]:
    rows = [
        ("Engineering", "ENG"),
        ("Finance", "FIN"),
        ("Human Resources", "HR"),
        ("Operations", "OPS"),
        ("Network Operations Center (NOC)", "NOC"),
        ("Systems Integration & Cloud", "SYS"),
        ("Cybersecurity & Telecom", "SEC"),
    ]
    out = {}
    for name, code in rows:
        dept, _ = await get_or_create(session, Department, {"name": name, "is_active": True}, code=code)
        out[code] = dept
    return out


async def seed_designations(session: AsyncSession) -> dict[str, Designation]:
    rows = [
        ("Senior Network Engineer", 2),
        ("Lead System Administrator", 3),
        ("NOC & Infrastructure Manager", 4),
        ("Cloud Solutions Architect", 3),
        ("Cybersecurity & Firewall Engineer", 2),
        ("Field Integration Specialist", 1),
        ("HR Executive", 2),
        ("HR Manager", 4),
        ("Software Engineer", 2),
        ("Engineering Manager", 4),
        ("System Administrator", 3),
        ("Operations Associate", 1),
    ]
    out = {}
    for title, level in rows:
        desig, _ = await get_or_create(
            session, Designation, {"level": level, "is_active": True}, title=title
        )
        out[title] = desig
    return out


async def seed_shifts(session: AsyncSession) -> dict[str, Shift]:
    day_shift, created = await get_or_create(
        session,
        Shift,
        {
            "start_time": time(9, 30),
            "end_time": time(18, 30),
            "grace_in_minutes": 10,
            "grace_out_minutes": 10,
            "break_minutes": 60,
            "full_day_minutes": 480,
            "half_day_minutes": 240,
            "crosses_midnight": False,
            "is_active": True,
        },
        name="Day Shift",
    )
    night_shift, night_created = await get_or_create(
        session,
        Shift,
        {
            "start_time": time(22, 0),
            "end_time": time(6, 0),
            "grace_in_minutes": 10,
            "grace_out_minutes": 10,
            "break_minutes": 60,
            "full_day_minutes": 480,
            "half_day_minutes": 240,
            "crosses_midnight": True,
            "is_active": True,
        },
        name="Night Shift",
    )
    await session.flush()

    for shift, was_created in ((day_shift, created), (night_shift, night_created)):
        if was_created:
            for weekday in (5, 6):  # Saturday, Sunday (0=Monday)
                session.add(WeeklyOff(shift_id=shift.id, weekday=weekday))

    return {"day": day_shift, "night": night_shift}


async def seed_leave_types(session: AsyncSession) -> dict[str, LeaveType]:
    rows = [
        dict(name="Casual Leave", code="CL", annual_quota=12, accrual=LeaveAccrual.MONTHLY,
             carry_forward_max=0, is_paid=True, requires_document=False),
        dict(name="Sick Leave", code="SL", annual_quota=12, accrual=LeaveAccrual.MONTHLY,
             carry_forward_max=0, is_paid=True, requires_document=False),
        dict(name="Earned Leave", code="EL", annual_quota=15, accrual=LeaveAccrual.YEARLY,
             carry_forward_max=30, is_paid=True, requires_document=False),
        dict(name="Maternity Leave", code="ML", annual_quota=182, accrual=LeaveAccrual.YEARLY,
             carry_forward_max=0, is_paid=True, requires_document=True),
        dict(name="Loss of Pay", code="LOP", annual_quota=0, accrual=LeaveAccrual.YEARLY,
             carry_forward_max=0, is_paid=False, requires_document=False),
    ]
    out = {}
    for row in rows:
        code = row.pop("code")
        lt, _ = await get_or_create(session, LeaveType, {**row, "is_active": True}, code=code)
        out[code] = lt
    return out


async def seed_holidays(session: AsyncSession) -> None:
    rows = [
        (date(CURRENT_YEAR, 1, 26), "Republic Day", False),
        (date(CURRENT_YEAR, 3, 6), "Holi", True),
        (date(CURRENT_YEAR, 4, 14), "Ambedkar Jayanti", True),
        (date(CURRENT_YEAR, 5, 1), "Labour Day", False),
        (date(CURRENT_YEAR, 8, 15), "Independence Day", False),
        (date(CURRENT_YEAR, 10, 2), "Gandhi Jayanti", False),
        (date(CURRENT_YEAR, 10, 21), "Diwali", False),
        (date(CURRENT_YEAR, 12, 25), "Christmas", False),
    ]
    for holiday_date, name, is_optional in rows:
        await get_or_create(
            session, Holiday, {"name": name, "is_optional": is_optional}, holiday_date=holiday_date
        )


async def seed_employee_with_user(
    session: AsyncSession,
    *,
    employee_code: str,
    full_name: str,
    official_email: str,
    designation: Designation,
    department: Department,
    shift: Shift,
    role: UserRole,
    reporting_manager_id: int | None,
) -> Employee:
    employee, created = await get_or_create(
        session,
        Employee,
        {
            "full_name": full_name,
            "official_email": official_email,
            "date_of_joining": date.today() - timedelta(days=180),
            "designation_id": designation.id,
            "department_id": department.id,
            "reporting_manager_id": reporting_manager_id,
            "employment_type": EmploymentType.FULL_TIME,
            "shift_id": shift.id,
            "work_location": WorkLocation.OFFICE,
            "employment_status": EmploymentStatus.ACTIVE,
        },
        employee_code=employee_code,
    )
    await session.flush()

    user, _ = await get_or_create(
        session,
        User,
        {
            "password_hash": hash_password(SEED_PASSWORD),
            "role": role,
            "is_active": True,
            "must_change_password": False,
        },
        employee_id=employee.id,
    )
    user.password_hash = hash_password(SEED_PASSWORD)
    user.is_active = True
    return employee


OFFICE_COORDS = (23.0225, 72.5714)  # Ahmedabad, used as a sample office location


async def seed_sample_punches(
    session: AsyncSession, employees: list[Employee], shifts_by_id: dict[int, Shift]
) -> None:
    today = date.today()
    for employee in employees:
        shift = shifts_by_id[employee.shift_id]
        for days_ago in range(30, 0, -1):
            work_date = today - timedelta(days=days_ago)
            if work_date.weekday() in (5, 6):  # skip weekends
                continue
            if random.random() < 0.05:  # occasional absence for realism
                continue

            in_jitter = random.randint(-15, 15)
            out_jitter = random.randint(-15, 20)
            in_dt = datetime.combine(work_date, shift.start_time, tzinfo=UTC) + timedelta(
                minutes=in_jitter
            )
            out_dt = datetime.combine(work_date, shift.end_time, tzinfo=UTC) + timedelta(
                minutes=out_jitter
            )
            if shift.crosses_midnight:
                out_dt += timedelta(days=1)

            source = random.choice([AttendanceSource.WEB, AttendanceSource.MOBILE])
            geo = {}
            if source == AttendanceSource.MOBILE:
                lat, lng = OFFICE_COORDS
                geo = {
                    "latitude": lat + random.uniform(-0.001, 0.001),
                    "longitude": lng + random.uniform(-0.001, 0.001),
                    "accuracy_metres": random.uniform(5, 25),
                    "is_mock_location": False,
                }

            for punch_dt, direction in ((in_dt, DirectionHint.IN), (out_dt, DirectionHint.OUT)):
                session.add(
                    AttendanceLog(
                        employee_id=employee.id,
                        punch_time_utc=punch_dt,
                        source=source,
                        direction_hint=direction,
                        client_punch_id=str(uuid.uuid4()),
                        **geo,
                    )
                )


async def main() -> None:
    async with async_session_factory() as session:
        departments = await seed_departments(session)
        designations = await seed_designations(session)
        shifts = await seed_shifts(session)
        await seed_leave_types(session)
        await seed_holidays(session)
        await session.commit()

        admin = await seed_employee_with_user(
            session,
            employee_code="ACT-0001",
            full_name="Aisha Admin",
            official_email="admin@company.local",
            designation=designations["Lead System Administrator"],
            department=departments["SYS"],
            shift=shifts["day"],
            role=UserRole.ADMIN,
            reporting_manager_id=None,
        )
        await session.commit()

        await seed_employee_with_user(
            session,
            employee_code="ACT-0002",
            full_name="Harsh Rao",
            official_email="hr@company.local",
            designation=designations["HR Manager"],
            department=departments["HR"],
            shift=shifts["day"],
            role=UserRole.HR,
            reporting_manager_id=admin.id,
        )
        await session.commit()

        manager = await seed_employee_with_user(
            session,
            employee_code="ACT-0003",
            full_name="Meera Menon",
            official_email="manager@company.local",
            designation=designations["NOC & Infrastructure Manager"],
            department=departments["NOC"],
            shift=shifts["day"],
            role=UserRole.MANAGER,
            reporting_manager_id=admin.id,
        )
        await session.commit()

        si_roles = [
            ("Ela Employee", "Senior Network Engineer", "NOC", "day"),
            ("Nikhil Naidu", "Cloud Solutions Architect", "SYS", "day"),
            ("Priya Patel", "Cybersecurity & Firewall Engineer", "SEC", "night"),
        ]
        employees = []
        for i, (name, desig_title, dept_code, shift_key) in enumerate(si_roles, start=4):
            emp = await seed_employee_with_user(
                session,
                employee_code=f"ACT-{i:04d}",
                full_name=name,
                official_email=f"employee{i}@company.local",
                designation=designations[desig_title],
                department=departments[dept_code],
                shift=shifts[shift_key],
                role=UserRole.EMPLOYEE,
                reporting_manager_id=manager.id,
            )
            employees.append(emp)
        await session.commit()

        shifts_by_id = {s.id: s for s in shifts.values()}
        await seed_sample_punches(session, [manager, *employees], shifts_by_id)
        await session.commit()

    print(f"Seed complete. Default password for all seeded users: {SEED_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
