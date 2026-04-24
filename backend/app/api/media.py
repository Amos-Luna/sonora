from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.db.models import User
from app.schemas import MediaPreview, PreviewRequest
from app.services.media_probe import build_preview
from app.services.rate_limit import enforce_preview_rate_limit

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/preview", response_model=MediaPreview)
def preview(
    payload: PreviewRequest,
    request: Request,
    _: User = Depends(get_current_user),
) -> MediaPreview:
    enforce_preview_rate_limit(request)
    return build_preview(str(payload.url))
