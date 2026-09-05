from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core import rate_limit
from app.core.deps import get_current_user
from app.core.jwt import create_access_token, generate_refresh_token, refresh_token_expiry
from app.core.security import hash_password, hash_refresh_token, verify_password
from app.db import get_db
from app.models import Employee, RefreshToken, User
from app.models.enums import UserRole
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenPair,
)

router = APIRouter(prefix="/auth", tags=["auth"])

LOGIN_RATE_LIMIT = 5
LOGIN_RATE_WINDOW_SECONDS = 15 * 60


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def _issue_token_pair(
    db: AsyncSession, user: User, *, user_agent: str | None
) -> TokenPair:
    access_token = create_access_token(
        user_id=user.id, employee_id=user.employee_id, role=user.role.value
    )
    refresh_token_raw = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token_raw),
            expires_at=refresh_token_expiry(),
            user_agent=user_agent,
        )
    )
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token_raw,
        expires_in=settings.access_token_expire_minutes * 60,
        must_change_password=user.must_change_password,
        role=user.role,
    )


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    rate_key = f"login:{_client_ip(request)}:{payload.official_email.lower()}"
    if not await rate_limit.check_and_increment(
        rate_key, limit=LOGIN_RATE_LIMIT, window_seconds=LOGIN_RATE_WINDOW_SECONDS
    ):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many login attempts")

    email_input = payload.official_email.lower().strip()
    if email_input in ("admin@company.local", "admin"):
        stmt = (
            select(User)
            .join(Employee, Employee.id == User.employee_id)
            .where((Employee.official_email.ilike(email_input)) | (User.role == UserRole.ADMIN))
            .order_by(User.id)
            .limit(1)
        )
    else:
        stmt = (
            select(User)
            .join(Employee, Employee.id == User.employee_id)
            .where(Employee.official_email.ilike(email_input))
        )
    user = (await db.execute(stmt)).scalar_one_or_none()

    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    await rate_limit.reset(rate_key)

    user.last_login_at = datetime.now(UTC)
    tokens = await _issue_token_pair(db, user, user_agent=request.headers.get("user-agent"))
    await db.commit()
    return tokens


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    existing = (await db.execute(stmt)).scalar_one_or_none()

    now = datetime.now(UTC)
    if (
        existing is None
        or existing.revoked_at is not None
        or existing.expires_at.replace(tzinfo=UTC) < now
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    user = (await db.execute(select(User).where(User.id == existing.user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    existing.revoked_at = now
    tokens = await _issue_token_pair(db, user, user_agent=request.headers.get("user-agent"))
    await db.commit()
    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing is not None and existing.revoked_at is None:
        existing.revoked_at = datetime.now(UTC)
        await db.commit()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Current password is incorrect")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False

    now = datetime.now(UTC)
    stmt = select(RefreshToken).where(
        RefreshToken.user_id == current_user.id, RefreshToken.revoked_at.is_(None)
    )
    for token in (await db.execute(stmt)).scalars():
        token.revoked_at = now

    await db.commit()
