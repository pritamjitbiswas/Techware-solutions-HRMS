from pydantic import BaseModel, Field

from app.models.enums import UserRole
from app.schemas.common import EmailField


class LoginRequest(BaseModel):
    official_email: EmailField
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    must_change_password: bool
    role: UserRole


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
