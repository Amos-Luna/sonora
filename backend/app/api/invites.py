import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    generate_invite_token,
    hash_invite_token,
)
from app.db.models import Invite, User, UserRole
from app.db.session import get_db
from app.schemas import (
    InviteCreate,
    InviteRedeemResponse,
    InviteResponse,
    UserResponse,
)
from app.services.rate_limit import enforce_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invites", tags=["invites"])


def _clamp_ttl(hours: int | None, settings: Settings) -> int:
    requested = hours or settings.invite_default_ttl_hours
    if requested < 1:
        return 1
    return min(requested, settings.invite_max_ttl_hours)


def _clamp_uses(max_uses: int | None, settings: Settings) -> int:
    return max(1, max_uses or settings.invite_default_max_uses)


def _build_url(settings: Settings, token: str) -> str:
    base = str(settings.frontend_base_url).rstrip("/")
    return f"{base}/invite/{token}"


def _invite_is_active(invite: Invite, now: datetime) -> bool:
    if invite.revoked_at is not None:
        return False
    if invite.expires_at <= now:
        return False
    return invite.used_count < invite.max_uses


def _serialize_invite(invite: Invite, *, url: str | None = None) -> InviteResponse:
    now = datetime.now(UTC)
    return InviteResponse(
        id=invite.id,
        label=invite.label,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        revoked_at=invite.revoked_at,
        max_uses=invite.max_uses,
        used_count=invite.used_count,
        is_active=_invite_is_active(invite, now),
        url=url,
    )


@router.post("", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def create_invite(
    payload: InviteCreate,
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> InviteResponse:
    ttl_hours = _clamp_ttl(payload.expires_in_hours, settings)
    token = generate_invite_token()
    invite = Invite(
        token_hash=hash_invite_token(token),
        label=(payload.label or None),
        created_by_id=owner.id,
        max_uses=_clamp_uses(payload.max_uses, settings),
        used_count=0,
        expires_at=datetime.now(UTC) + timedelta(hours=ttl_hours),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return _serialize_invite(invite, url=_build_url(settings, token))


@router.get("", response_model=list[InviteResponse])
def list_invites(
    _: User = Depends(require_owner),
    db: Session = Depends(get_db),
) -> list[InviteResponse]:
    invites = db.scalars(select(Invite).order_by(Invite.created_at.desc()).limit(100)).all()
    return [_serialize_invite(invite) for invite in invites]


@router.delete("/{invite_id}", status_code=status.HTTP_200_OK, response_model=InviteResponse)
def revoke_invite(
    invite_id: str,
    _: User = Depends(require_owner),
    db: Session = Depends(get_db),
) -> InviteResponse:
    invite = db.get(Invite, invite_id)
    if invite is None:
        raise AppError(
            title="Invite not found",
            detail="The requested invite does not exist.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="https://sonora.app/problems/invite-not-found",
        )
    if invite.revoked_at is None:
        invite.revoked_at = datetime.now(UTC)
        db.add(invite)
        db.commit()
        db.refresh(invite)
    return _serialize_invite(invite)


@router.post("/{token}/redeem", response_model=InviteRedeemResponse)
def redeem_invite(
    token: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> InviteRedeemResponse:
    client_ip = request.client.host if request.client else "anonymous"
    enforce_rate_limit(f"invite-redeem:{client_ip}", settings.invite_redeem_per_minute, 60)

    invite = db.scalar(select(Invite).where(Invite.token_hash == hash_invite_token(token)))
    now = datetime.now(UTC)
    if invite is None or not _invite_is_active(invite, now):
        raise AppError(
            title="Invite invalid",
            detail="This invite link is expired, revoked or already used.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="https://sonora.app/problems/invite-invalid",
        )

    guest_email = f"guest-{uuid.uuid4().hex[:12]}@guests.sonora.app"
    guest = User(
        email=guest_email,
        password_hash=None,
        full_name=invite.label or "Guest",
        role=UserRole.guest,
        invited_by_id=invite.created_by_id,
        invite_label=invite.label,
        is_active=True,
    )
    db.add(guest)

    invite.used_count += 1
    db.add(invite)
    db.commit()
    db.refresh(guest)

    logger.info(
        "Invite %s redeemed by ip=%s label=%s guest=%s",
        invite.id,
        client_ip,
        invite.label,
        guest.id,
    )

    access_token = create_access_token(guest.id)
    response.set_cookie(
        "sonora_session",
        access_token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    return InviteRedeemResponse(
        access_token=access_token,
        user=UserResponse.model_validate(guest),
    )
