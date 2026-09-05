from app.models.enums import EmploymentType, UserRole, WorkLocation


async def _login(client, employee, password):
    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_role_change_requires_admin(client, make_employee):
    hr_employee, _, hr_password = await make_employee(role=UserRole.HR)
    target_employee, _, _ = await make_employee(role=UserRole.EMPLOYEE)
    hr_token = await _login(client, hr_employee, hr_password)

    response = await client.patch(
        f"/v1/employees/{target_employee.id}",
        json={"is_active": False},
        headers=_auth_headers(hr_token),
    )
    assert response.status_code == 403


async def test_admin_can_change_role_and_status(client, make_employee):
    admin_employee, _, admin_password = await make_employee(role=UserRole.ADMIN)
    target_employee, _, _ = await make_employee(role=UserRole.EMPLOYEE)
    admin_token = await _login(client, admin_employee, admin_password)

    response = await client.patch(
        f"/v1/employees/{target_employee.id}",
        json={"role": UserRole.MANAGER.value},
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 200
    assert response.json()["role"] == UserRole.MANAGER.value


async def test_employee_cannot_patch_admin_field_via_me(client, make_employee):
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    response = await client.patch(
        "/v1/me", json={"designation_id": 1}, headers=_auth_headers(token)
    )
    assert response.status_code == 403


async def test_employee_can_patch_self_service_field(client, make_employee):
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    response = await client.patch(
        "/v1/me", json={"blood_group": "O+"}, headers=_auth_headers(token)
    )
    assert response.status_code == 200
    assert response.json()["blood_group"] == "O+"


async def test_employee_cannot_list_employees(client, make_employee):
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    response = await client.get("/v1/employees", headers=_auth_headers(token))
    assert response.status_code == 403


async def test_manager_can_list_employees(client, make_employee):
    manager_employee, _, manager_password = await make_employee(role=UserRole.MANAGER)
    token = await _login(client, manager_employee, manager_password)

    response = await client.get("/v1/employees", headers=_auth_headers(token))
    assert response.status_code == 200


async def test_finance_gated_to_hr_and_admin(client, make_employee):
    manager_employee, _, manager_password = await make_employee(role=UserRole.MANAGER)
    target_employee, _, _ = await make_employee(role=UserRole.EMPLOYEE)
    manager_token = await _login(client, manager_employee, manager_password)

    response = await client.get(
        f"/v1/employees/{target_employee.id}/finance", headers=_auth_headers(manager_token)
    )
    assert response.status_code == 403


async def test_hr_create_employee_wizard(client, make_employee):
    hr_employee, _, hr_password = await make_employee(role=UserRole.HR)
    hr_token = await _login(client, hr_employee, hr_password)

    payload = {
        "full_name": "New Hire",
        "official_email": "new.hire.wizard@test.local",
        "date_of_joining": "2026-01-01",
        "employment_type": EmploymentType.FULL_TIME.value,
        "work_location": WorkLocation.OFFICE.value,
        "role": UserRole.EMPLOYEE.value,
    }
    response = await client.post("/v1/employees", json=payload, headers=_auth_headers(hr_token))
    assert response.status_code == 201
    body = response.json()
    assert body["temporary_password"]
    assert body["employee"]["employee_code"].startswith("ACT-")

    relogin = await client.post(
        "/v1/auth/login",
        json={"official_email": "new.hire.wizard@test.local", "password": body["temporary_password"]},
    )
    assert relogin.status_code == 200
