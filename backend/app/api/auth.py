from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import create_access_token, verify_password
from app.db.models import User, UserRole
from app.db.session import get_db
from app.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def issue_session(response: Response, user: User) -> TokenResponse:
    settings = get_settings()
    token = create_access_token(user.id)
    response.set_cookie(
        "sonora_session",
        token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if (
        user is None
        or user.role != UserRole.owner
        or not user.password_hash
        or not verify_password(payload.password, user.password_hash)
    ):
        raise AppError(
            title="Invalid credentials",
            detail="Email or password is incorrect.",
            status_code=401,
            error_type="https://sonora.app/problems/invalid-credentials",
        )
    if not user.is_active:
        raise AppError(
            title="Account disabled",
            detail="This account is not active.",
            status_code=403,
            error_type="https://sonora.app/problems/account-disabled",
        )
    return issue_session(response, user)


@router.post("/logout")
def logout(response: Response, _: User = Depends(get_current_user)) -> dict[str, str]:
    response.delete_cookie("sonora_session")
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(user)
