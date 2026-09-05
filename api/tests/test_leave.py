from app.models import LeaveType
from app.models.enums import LeaveAccrual, UserRole


async def _login(client, employee, password) -> str:
    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _make_leave_type(db_session) -> LeaveType:
    leave_type = LeaveType(
        name="Casual Leave",
        code=f"CL-{id(object())}",
        annual_quota=12,
        accrual=LeaveAccrual.MONTHLY,
        carry_forward_max=0,
        is_paid=True,
        requires_document=False,
        is_active=True,
    )
    db_session.add(leave_type)
    await db_session.flush()
    return leave_type


async def test_employee_can_apply_for_leave(client, make_employee, db_session):
    leave_type = await _make_leave_type(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/leave/requests",
        json={
            "leave_type_id": leave_type.id,
            "from_date": "2026-09-01",
            "to_date": "2026-09-02",
            "is_half_day": False,
            "reason": "Family event",
        },
        headers=_auth_headers(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["total_days"] == "2.00"

    balance = await client.get("/v1/me/leave-balance?year=2026", headers=_auth_headers(token))
    assert balance.status_code == 200
    row = next(b for b in balance.json() if b["leave_type_id"] == leave_type.id)
    assert row["pending"] == "2.00"


async def test_employee_cannot_approve_own_leave(client, make_employee, db_session):
    leave_type = await _make_leave_type(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    apply_resp = await client.post(
        "/v1/leave/requests",
        json={
            "leave_type_id": leave_type.id, "from_date": "2026-09-01", "to_date": "2026-09-01",
            "is_half_day": False, "reason": "x",
        },
        headers=_auth_headers(token),
    )
    request_id = apply_resp.json()["id"]

    response = await client.post(
        f"/v1/leave/requests/{request_id}/approve", json={}, headers=_auth_headers(token)
    )
    assert response.status_code == 403


async def test_manager_approves_direct_report_leave_moves_pending_to_used(client, make_employee, db_session):
    leave_type = await _make_leave_type(db_session)
    manager, _, manager_password = await make_employee(role=UserRole.MANAGER)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, reporting_manager_id=manager.id)
    token = await _login(client, employee, password)
    manager_token = await _login(client, manager, manager_password)

    apply_resp = await client.post(
        "/v1/leave/requests",
        json={
            "leave_type_id": leave_type.id, "from_date": "2026-09-01", "to_date": "2026-09-01",
            "is_half_day": False, "reason": "x",
        },
        headers=_auth_headers(token),
    )
    request_id = apply_resp.json()["id"]

    response = await client.post(
        f"/v1/leave/requests/{request_id}/approve",
        json={"comment": "Approved, enjoy"},
        headers=_auth_headers(manager_token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    balance = await client.get("/v1/me/leave-balance?year=2026", headers=_auth_headers(token))
    row = next(b for b in balance.json() if b["leave_type_id"] == leave_type.id)
    assert row["pending"] == "0.00"
    assert row["used"] == "1.00"


async def test_manager_cannot_approve_non_direct_report_leave(client, make_employee, db_session):
    leave_type = await _make_leave_type(db_session)
    manager, _, manager_password = await make_employee(role=UserRole.MANAGER)
    other_manager, _, _ = await make_employee(role=UserRole.MANAGER)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE, reporting_manager_id=other_manager.id)
    token = await _login(client, employee, password)
    manager_token = await _login(client, manager, manager_password)

    apply_resp = await client.post(
        "/v1/leave/requests",
        json={
            "leave_type_id": leave_type.id, "from_date": "2026-09-01", "to_date": "2026-09-01",
            "is_half_day": False, "reason": "x",
        },
        headers=_auth_headers(token),
    )
    request_id = apply_resp.json()["id"]

    response = await client.post(
        f"/v1/leave/requests/{request_id}/approve", json={}, headers=_auth_headers(manager_token)
    )
    assert response.status_code == 403


async def test_employee_can_cancel_own_pending_leave_and_release_balance(client, make_employee, db_session):
    leave_type = await _make_leave_type(db_session)
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    apply_resp = await client.post(
        "/v1/leave/requests",
        json={
            "leave_type_id": leave_type.id, "from_date": "2026-09-01", "to_date": "2026-09-01",
            "is_half_day": False, "reason": "x",
        },
        headers=_auth_headers(token),
    )
    request_id = apply_resp.json()["id"]

    response = await client.post(f"/v1/leave/requests/{request_id}/cancel", headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"

    balance = await client.get("/v1/me/leave-balance?year=2026", headers=_auth_headers(token))
    row = next(b for b in balance.json() if b["leave_type_id"] == leave_type.id)
    assert row["pending"] == "0.00"


async def test_employee_only_sees_own_requests_hr_sees_all(client, make_employee, db_session):
    leave_type = await _make_leave_type(db_session)
    hr, _, hr_password = await make_employee(role=UserRole.HR)
    employee_a, _, password_a = await make_employee(role=UserRole.EMPLOYEE)
    employee_b, _, password_b = await make_employee(role=UserRole.EMPLOYEE)
    token_a = await _login(client, employee_a, password_a)
    token_b = await _login(client, employee_b, password_b)
    hr_token = await _login(client, hr, hr_password)

    for token in (token_a, token_b):
        await client.post(
            "/v1/leave/requests",
            json={
                "leave_type_id": leave_type.id, "from_date": "2026-09-01", "to_date": "2026-09-01",
                "is_half_day": False, "reason": "x",
            },
            headers=_auth_headers(token),
        )

    own = await client.get("/v1/leave/requests", headers=_auth_headers(token_a))
    assert own.status_code == 200
    assert all(r["employee_id"] == employee_a.id for r in own.json())

    hr_view = await client.get("/v1/leave/requests", headers=_auth_headers(hr_token))
    assert hr_view.status_code == 200
    employee_ids = {r["employee_id"] for r in hr_view.json()}
    assert {employee_a.id, employee_b.id}.issubset(employee_ids)
