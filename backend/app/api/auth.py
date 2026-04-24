from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.schemas import LoginRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_session(response: Response, user: User) -> TokenResponse:
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


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise AppError(
            title="Account exists",
            detail="An account with this email already exists.",
            status_code=status.HTTP_409_CONFLICT,
            error_type="https://sonora.app/problems/account-exists",
        ) from exc
    return _issue_session(response, user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise AppError(
            title="Invalid credentials",
            detail="Email or password is incorrect.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_type="https://sonora.app/problems/invalid-credentials",
        )
    return _issue_session(response, user)
