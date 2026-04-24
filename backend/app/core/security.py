from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import bcrypt
from fastapi import Request, status
from jose import JWTError, jwt

from app.core.config import Settings, get_settings
from app.core.errors import AppError


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise AppError(
            title="Password too long",
            detail="Passwords must be 72 bytes or fewer.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_type="https://sonora.app/problems/password-too-long",
        )
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, settings: Settings | None = None) -> str:
    active_settings = settings or get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=active_settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "iss": active_settings.jwt_issuer,
        "sub": subject,
        "exp": expires_at,
        "iat": datetime.now(UTC),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, active_settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str, settings: Settings | None = None) -> str:
    active_settings = settings or get_settings()
    try:
        payload = jwt.decode(
            token,
            active_settings.jwt_secret,
            algorithms=["HS256"],
            issuer=active_settings.jwt_issuer,
        )
    except JWTError as exc:
        raise AppError(
            title="Unauthorized",
            detail="The session token is invalid or expired.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_type="https://sonora.app/problems/invalid-token",
        ) from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise AppError(
            title="Unauthorized",
            detail="The session token is missing a subject.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_type="https://sonora.app/problems/invalid-token",
        )
    return subject


def bearer_token_from_request(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    cookie_token = request.cookies.get("sonora_session")
    if cookie_token:
        return cookie_token
    raise AppError(
        title="Unauthorized",
        detail="Authentication is required for this action.",
        status_code=status.HTTP_401_UNAUTHORIZED,
        error_type="https://sonora.app/problems/auth-required",
    )
