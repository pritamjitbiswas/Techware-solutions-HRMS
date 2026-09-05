from sqlalchemy import select

from app.core.security import hash_refresh_token
from app.models import RefreshToken
from app.models.enums import UserRole


async def test_login_success(client, make_employee):
    employee, user, password = await make_employee()

    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["role"] == UserRole.EMPLOYEE.value


async def test_login_wrong_password(client, make_employee):
    employee, _, _ = await make_employee()

    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": "wrong"}
    )

    assert response.status_code == 401


async def test_login_rate_limited_after_five_attempts(client, make_employee):
    employee, _, _ = await make_employee()

    for _ in range(5):
        r = await client.post(
            "/v1/auth/login", json={"official_email": employee.official_email, "password": "wrong"}
        )
        assert r.status_code == 401

    r = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": "wrong"}
    )
    assert r.status_code == 429


async def test_refresh_rotates_token(client, make_employee):
    employee, _, password = await make_employee()
    login = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    old_refresh = login.json()["refresh_token"]

    refreshed = await client.post("/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200
    assert refreshed.json()["refresh_token"] != old_refresh

    reuse_attempt = await client.post("/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reuse_attempt.status_code == 401


async def test_logout_revokes_refresh_token(client, make_employee, db_session):
    employee, _, password = await make_employee()
    login = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    refresh_token = login.json()["refresh_token"]

    logout = await client.post("/v1/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 204

    row = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(refresh_token))
        )
    ).scalar_one()
    assert row.revoked_at is not None

    reuse_attempt = await client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_attempt.status_code == 401


async def test_change_password_revokes_other_sessions(client, make_employee):
    employee, _, password = await make_employee()
    login = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    tokens = login.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    change = await client.post(
        "/v1/auth/change-password",
        json={"current_password": password, "new_password": "NewPass456!"},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert change.status_code == 204

    reuse_attempt = await client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_attempt.status_code == 401

    relogin = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": "NewPass456!"}
    )
    assert relogin.status_code == 200
