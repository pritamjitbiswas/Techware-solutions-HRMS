from datetime import time

from app.models import Shift
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


async def test_employee_creates_regularisation_request(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/regularisations",
        json={
            "work_date": "2026-09-01",
            "requested_in_time": "09:28:00",
            "requested_out_time": "18:35:00",
            "reason": "Forgot to punch, worked normal hours",
        },
        headers=_auth_headers(token),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


async def test_manager_approves_regularisation_and_overrides_attendance(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    manager, _, manager_password = await make_employee(role=UserRole.MANAGER)
    employee, _, password = await make_employee(
        role=UserRole.EMPLOYEE, shift_id=shift.id, reporting_manager_id=manager.id
    )
    token = await _login(client, employee, password)
    manager_token = await _login(client, manager, manager_password)

    create_resp = await client.post(
        "/v1/regularisations",
        json={
            "work_date": "2026-09-01",
            "requested_in_time": "09:28:00",
            "requested_out_time": "18:35:00",
            "reason": "Forgot to punch",
        },
        headers=_auth_headers(token),
    )
    request_id = create_resp.json()["id"]

    approve_resp = await client.post(
        f"/v1/regularisations/{request_id}/approve",
        json={"comment": "Verified with security logs"},
        headers=_auth_headers(manager_token),
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"

    daily = await client.get(
        f"/v1/attendance/{employee.id}?from=2026-09-01&to=2026-09-01", headers=_auth_headers(manager_token)
    )
    assert daily.status_code == 200
    rows = daily.json()
    assert len(rows) == 1
    assert rows[0]["is_manual_override"] is True
    assert rows[0]["status"] == "present"
    assert rows[0]["override_reason"] == "Forgot to punch"


async def test_unrelated_manager_cannot_approve_regularisation(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    manager, _, manager_password = await make_employee(role=UserRole.MANAGER)
    other_manager, _, _ = await make_employee(role=UserRole.MANAGER)
    employee, _, password = await make_employee(
        role=UserRole.EMPLOYEE, shift_id=shift.id, reporting_manager_id=other_manager.id
    )
    token = await _login(client, employee, password)
    manager_token = await _login(client, manager, manager_password)

    create_resp = await client.post(
        "/v1/regularisations",
        json={"work_date": "2026-09-01", "requested_in_time": "09:28:00", "reason": "x"},
        headers=_auth_headers(token),
    )
    request_id = create_resp.json()["id"]

    response = await client.post(
        f"/v1/regularisations/{request_id}/approve", json={}, headers=_auth_headers(manager_token)
    )
    assert response.status_code == 403


async def test_regularisation_requires_at_least_one_time(client, make_employee, db_session):
    shift = await _make_day_shift(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, shift_id=shift.id)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/regularisations",
        json={"work_date": "2026-09-01", "reason": "x"},
        headers=_auth_headers(token),
    )
    assert response.status_code == 422
