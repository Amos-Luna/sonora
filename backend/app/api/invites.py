import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Mapping

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_owner
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    generate_invite_token,
    hash_invite_token,
)
from app.db.models import Invite, JobAction, JobStatus, MediaJob, User, UserRole
from app.db.session import get_db
from app.schemas import (
    InviteCondition,
    InviteCreate,
    InviteRedeemResponse,
    InviteResponse,
    UserResponse,
)
from app.services.rate_limit import enforce_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invites", tags=["invites"])


class _InviteStats:
    __slots__ = ("total", "videos", "audios", "completed", "failed", "last_activity")

    def __init__(
        self,
        total: int = 0,
        videos: int = 0,
        audios: int = 0,
        completed: int = 0,
        failed: int = 0,
        last_activity: datetime | None = None,
    ) -> None:
        self.total = total
        self.videos = videos
        self.audios = audios
        self.completed = completed
        self.failed = failed
        self.last_activity = last_activity


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


def _condition(invite: Invite, now: datetime) -> InviteCondition:
    if invite.revoked_at is not None:
        return InviteCondition.revoked
    if invite.expires_at <= now:
        return InviteCondition.expired
    if invite.used_count >= invite.max_uses:
        return InviteCondition.exhausted
    return InviteCondition.active


def _invite_is_active(invite: Invite, now: datetime) -> bool:
    return _condition(invite, now) == InviteCondition.active


def _serialize_invite(
    invite: Invite,
    *,
    url: str | None = None,
    stats: _InviteStats | None = None,
) -> InviteResponse:
    now = datetime.now(UTC)
    stats = stats or _InviteStats()
    condition = _condition(invite, now)
    return InviteResponse(
        id=invite.id,
        label=invite.label,
        created_at=invite.created_at,
        expires_at=invite.expires_at,
        revoked_at=invite.revoked_at,
        max_uses=invite.max_uses,
        used_count=invite.used_count,
        is_active=condition == InviteCondition.active,
        condition=condition,
        downloads_total=stats.total,
        downloads_video=stats.videos,
        downloads_audio=stats.audios,
        downloads_completed=stats.completed,
        downloads_failed=stats.failed,
        last_activity_at=stats.last_activity,
        url=url,
    )


def _load_stats_map(db: Session) -> Mapping[str, _InviteStats]:
    one = 1
    zero = 0
    rows = db.execute(
        select(
            User.source_invite_id,
            func.count(MediaJob.id),
            func.coalesce(
                func.sum(case((MediaJob.action == JobAction.video_download, one), else_=zero)),
                zero,
            ),
            func.coalesce(
                func.sum(case((MediaJob.action == JobAction.audio_download, one), else_=zero)),
                zero,
            ),
            func.coalesce(
                func.sum(case((MediaJob.status == JobStatus.completed, one), else_=zero)),
                zero,
            ),
            func.coalesce(
                func.sum(case((MediaJob.status == JobStatus.failed, one), else_=zero)),
                zero,
            ),
            func.max(MediaJob.created_at),
        )
        .select_from(User)
        .join(MediaJob, MediaJob.user_id == User.id)
        .where(User.source_invite_id.is_not(None))
        .group_by(User.source_invite_id)
    ).all()
    result: dict[str, _InviteStats] = {}
    for row in rows:
        invite_id = row[0]
        if not invite_id:
            continue
        result[invite_id] = _InviteStats(
            total=int(row[1] or 0),
            videos=int(row[2] or 0),
            audios=int(row[3] or 0),
            completed=int(row[4] or 0),
            failed=int(row[5] or 0),
            last_activity=row[6],
        )
    return result


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
    stats = _load_stats_map(db)
    invites = db.scalars(
        select(Invite).order_by(Invite.created_at.desc()).limit(100)
    ).all()
    return [_serialize_invite(invite, stats=stats.get(invite.id)) for invite in invites]


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
    stats = _load_stats_map(db).get(invite.id)
    return _serialize_invite(invite, stats=stats)


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
        source_invite_id=invite.id,
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
