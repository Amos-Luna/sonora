import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import hash_password, verify_password
from app.db.models import User, UserRole

logger = logging.getLogger(__name__)


def ensure_owner_user(db: Session, settings: Settings) -> User:
    """Create or heal the single owner account. Idempotent.

    Behavior:
    - If no user with owner_email exists, create one with role=owner.
    - If a user exists but is not owner, promote it.
    - If the owner password in settings does not match the stored hash,
      rotate the hash so that redeploying with a new OWNER_PASSWORD works.
    """
    email = settings.owner_email.strip().lower()
    owner = db.scalar(select(User).where(User.email == email))
    new_hash = hash_password(settings.owner_password)

    if owner is None:
        owner = User(
            email=email,
            password_hash=new_hash,
            full_name=settings.owner_full_name,
            role=UserRole.owner,
            is_active=True,
        )
        db.add(owner)
        db.commit()
        db.refresh(owner)
        logger.info("Seeded owner account for %s", email)
        return owner

    dirty = False
    if owner.role != UserRole.owner:
        owner.role = UserRole.owner
        dirty = True
    if not owner.is_active:
        owner.is_active = True
        dirty = True
    if not owner.password_hash or not verify_password(settings.owner_password, owner.password_hash):
        owner.password_hash = new_hash
        dirty = True
        logger.info("Rotated owner password hash for %s", email)

    if dirty:
        db.add(owner)
        db.commit()
        db.refresh(owner)
    return owner
