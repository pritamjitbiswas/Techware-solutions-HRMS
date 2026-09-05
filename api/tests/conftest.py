import uuid
from datetime import date
from pathlib import Path

import pytest_asyncio
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Allow running `pytest` locally (outside docker compose) by picking up the
# repo-root .env the same way docker-compose's `env_file: .env` would.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Employee, User  # noqa: E402
from app.models.enums import EmploymentType, UserRole, WorkLocation  # noqa: E402

DEFAULT_TEST_PASSWORD = "TestPass123!"


@pytest_asyncio.fixture
async def db_session():
    # A fresh engine per test (rather than the app's module-level singleton)
    # keeps every connection bound to this test's own event loop.
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    try:
        async with engine.connect() as conn:
            await conn.begin()
            session = AsyncSession(
                bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False
            )
            try:
                yield session
            finally:
                await session.close()
                await conn.rollback()
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
def make_employee(db_session: AsyncSession):
    async def _make(
        *,
        role: UserRole = UserRole.EMPLOYEE,
        password: str = DEFAULT_TEST_PASSWORD,
        is_active: bool = True,
        must_change_password: bool = False,
        **overrides,
    ) -> tuple[Employee, User, str]:
        unique = uuid.uuid4().hex[:10]
        fields = {
            "employee_code": f"TST-{unique}",
            "full_name": "Test Employee",
            "official_email": f"{unique}@test.local",
            "date_of_joining": date.today(),
            "employment_type": EmploymentType.FULL_TIME,
            "work_location": WorkLocation.OFFICE,
        }
        fields.update(overrides)

        employee = Employee(**fields)
        db_session.add(employee)
        await db_session.flush()

        user = User(
            employee_id=employee.id,
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
            must_change_password=must_change_password,
        )
        db_session.add(user)
        await db_session.flush()

        return employee, user, password

    return _make
