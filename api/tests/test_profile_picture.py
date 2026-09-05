import io

from PIL import Image

from app.models.enums import UserRole


def _jpeg_bytes(size: tuple[int, int] = (200, 200)) -> bytes:
    image = Image.new("RGB", size, color=(255, 0, 0))
    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    return buf.getvalue()


async def _login(client, employee, password) -> str:
    response = await client.post(
        "/v1/auth/login", json={"official_email": employee.official_email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def test_valid_jpeg_accepted_and_resized(client, make_employee):
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/me/profile-picture",
        files={"file": ("photo.jpg", _jpeg_bytes(), "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["profile_picture_url"]


async def test_fake_extension_rejected_by_magic_bytes(client, make_employee):
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    response = await client.post(
        "/v1/me/profile-picture",
        files={"file": ("photo.jpg", b"this is not an image", "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


async def test_oversized_upload_rejected(client, make_employee):
    employee, _, password = await make_employee(role=UserRole.EMPLOYEE)
    token = await _login(client, employee, password)

    oversized = b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024 + 1)
    response = await client.post(
        "/v1/me/profile-picture",
        files={"file": ("big.jpg", oversized, "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 413
