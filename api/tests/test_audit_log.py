from sqlalchemy import select

from app.models import AuditLog
from app.models.enums import EmploymentType, UserRole, WorkLocation


async def _login(client, employee, password) -> str:
    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def test_employee_create_writes_audit_row(client, make_employee, db_session):
    hr_employee, _, hr_password = await make_employee(role=UserRole.HR)
    hr_token = await _login(client, hr_employee, hr_password)

    payload = {
        "full_name": "Audit Trail Hire",
        "official_email": "audit.trail.hire@test.local",
        "date_of_joining": "2026-01-01",
        "employment_type": EmploymentType.FULL_TIME.value,
        "work_location": WorkLocation.OFFICE.value,
        "role": UserRole.EMPLOYEE.value,
    }
    response = await client.post(
        "/v1/employees", json=payload, headers={"Authorization": f"Bearer {hr_token}"}
    )
    assert response.status_code == 201
    new_employee_id = response.json()["employee"]["id"]

    audit_row = (
        await db_session.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "employee",
                AuditLog.entity_id == new_employee_id,
                AuditLog.action == "create",
            )
        )
    ).scalar_one()
    assert audit_row.before_json is None
    assert audit_row.after_json["full_name"] == "Audit Trail Hire"


async def test_employee_update_writes_before_after(client, make_employee, db_session):
    hr_employee, _, hr_password = await make_employee(role=UserRole.HR)
    target_employee, _, _ = await make_employee(role=UserRole.EMPLOYEE, full_name="Original Name")
    hr_token = await _login(client, hr_employee, hr_password)

    response = await client.patch(
        f"/v1/employees/{target_employee.id}",
        json={"full_name": "Updated Name"},
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert response.status_code == 200

    audit_row = (
        await db_session.execute(
            select(AuditLog).where(
                AuditLog.entity_type == "employee",
                AuditLog.entity_id == target_employee.id,
                AuditLog.action == "update",
            )
        )
    ).scalar_one()
    assert audit_row.before_json["full_name"] == "Original Name"
    assert audit_row.after_json["full_name"] == "Updated Name"
