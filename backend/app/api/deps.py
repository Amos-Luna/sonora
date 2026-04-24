from fastapi import Depends, Request, status
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import bearer_token_from_request, decode_access_token
from app.db.models import User
from app.db.session import get_db


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    subject = decode_access_token(bearer_token_from_request(request))
    user = db.get(User, subject)
    if user is None or not user.is_active:
        raise AppError(
            title="Unauthorized",
            detail="The authenticated user no longer exists or is inactive.",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_type="https://sonora.app/problems/user-inactive",
        )
    return user
