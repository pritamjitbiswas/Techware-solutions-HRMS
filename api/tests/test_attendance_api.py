import uuid
from datetime import time

from sqlalchemy import select

from app.models import AuditLog, Shift
from app.models.enums import UserRole


async def _login(client, employee, password) -> str:
    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _make_day_shift(db_session) -> Shift:
    shift = Shift(
        name="Day Shift",
        start_time=time(9, 30),
        end_time=time(18, 30),
        grace_in_minutes=10,
        grace_out_minutes=10,
        break_minutes=60,
        full_day_minutes=480,
        half_day_minutes=240,
        crosses_midnight=False,
        is_active=True,
    )
    db_session.add(shift)
    await db_session.flush()
    return shift


async def test_punch_creates_log_and_returns_geo_flag(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/attendance/punch",
        json={
            "client_punch_id": str(uuid.uuid4()),
            "source": "web",
            "direction_hint": "in",
            "geo": {"latitude": 23.02, "longitude": 72.57, "accuracy_metres": 250, "is_mock_location": False},
        },
        headers=_auth_headers(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["employee_id"] == employee.id
    assert body["geo_flag"] == "low_accuracy"


async def test_duplicate_client_punch_id_is_idempotent(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)
    client_punch_id = str(uuid.uuid4())

    first = await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": client_punch_id, "source": "web", "direction_hint": "in", "geo": None},
        headers=_auth_headers(token),
    )
    second = await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": client_punch_id, "source": "web", "direction_hint": "in", "geo": None},
        headers=_auth_headers(token),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


async def test_second_punch_within_60s_is_rejected(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)

    first = await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": str(uuid.uuid4()), "source": "web", "direction_hint": "in", "geo": None},
        headers=_auth_headers(token),
    )
    assert first.status_code == 201

    second = await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": str(uuid.uuid4()), "source": "web", "direction_hint": "out", "geo": None},
        headers=_auth_headers(token),
    )
    assert second.status_code == 409


async def test_web_punch_without_geo_is_accepted(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": str(uuid.uuid4()), "source": "web", "direction_hint": "in"},
        headers=_auth_headers(token),
    )
    assert response.status_code == 201
    assert response.json()["latitude"] is None


async def test_today_punches_returns_array(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)

    await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": str(uuid.uuid4()), "source": "web", "direction_hint": "in"},
        headers=_auth_headers(token),
    )
    response = await client.get("/v1/attendance/today", headers=_auth_headers(token))
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) == 1


async def test_manager_cannot_view_non_direct_report_attendance(client, make_employee, db_session):
    manager, _, manager_password = await make_employee(role=UserRole.MANAGER)
    other_manager, _, _ = await make_employee(role=UserRole.MANAGER)
    stranger, _, _ = await make_employee(role=UserRole.EMPLOYEE, reporting_manager_id=other_manager.id)
    token = await _login(client, manager, manager_password)

    response = await client.get(
        f"/v1/attendance/{stranger.id}?from=2026-01-01&to=2026-01-31", headers=_auth_headers(token)
    )
    assert response.status_code == 403


async def test_hr_can_override_attendance_daily_with_audit(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    hr, _, hr_password = await make_employee(role=UserRole.HR)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)
    hr_token = await _login(client, hr, hr_password)

    await client.post(
        "/v1/attendance/punch",
        json={"client_punch_id": str(uuid.uuid4()), "source": "web", "direction_hint": "in"},
        headers=_auth_headers(token),
    )
    listing = await client.get(
        f"/v1/attendance/{employee.id}?from=2020-01-01&to=2030-01-01", headers=_auth_headers(hr_token)
    )
    assert listing.status_code == 200
    daily_id = listing.json()[0]["id"]

    response = await client.patch(
        f"/v1/attendance/daily/{daily_id}/override",
        json={"reason": "Forgot to punch out, verified via security logs", "status": "present"},
        headers=_auth_headers(hr_token),
    )
    assert response.status_code == 200
    assert response.json()["is_manual_override"] is True
    assert response.json()["status"] == "present"

    audit_row = (
        await db_session.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "attendance_daily",
                AuditLog.entity_id == daily_id,
                AuditLog.action == "override",
            )
        )
    ).scalar_one()
    assert audit_row.after_json["is_manual_override"] is True
