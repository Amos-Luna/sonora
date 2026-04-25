from urllib.parse import urlparse

from fastapi import status
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

from app.core.config import get_settings
from app.core.errors import AppError
from app.schemas import MediaFormat, MediaPreview
from app.services.ytdlp_config import base_ydl_opts

SUPPORTED_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}


def validate_supported_url(url: str) -> None:
    host = urlparse(url).netloc.lower()
    if host not in SUPPORTED_HOSTS:
        raise AppError(
            title="Unsupported source",
            detail="Only YouTube links are supported in the current MVP.",
            status_code=status.HTTP_400_BAD_REQUEST,
            error_type="https://sonora.app/problems/unsupported-source",
        )


def build_preview(url: str) -> MediaPreview:
    settings = get_settings()
    validate_supported_url(url)

    try:
        with YoutubeDL({**base_ydl_opts(), "skip_download": True}) as ydl:
            info = ydl.extract_info(url, download=False)
    except DownloadError as exc:
        raise AppError(
            title="Preview failed",
            detail="The media could not be inspected. Check that the video is public and available.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_type="https://sonora.app/problems/preview-failed",
        ) from exc
    except Exception as exc:
        raise AppError(
            title="Preview failed",
            detail="The media provider returned an unexpected response.",
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_type="https://sonora.app/problems/provider-error",
        ) from exc

    duration = info.get("duration")
    if isinstance(duration, int) and duration > settings.max_media_duration_seconds:
        raise AppError(
            title="Media too long",
            detail=f"Videos longer than {settings.max_media_duration_seconds} seconds are blocked for cost protection.",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            error_type="https://sonora.app/problems/media-too-long",
        )

    formats = [
        MediaFormat(
            format_id=str(item.get("format_id", "")),
            extension=item.get("ext"),
            resolution=item.get("resolution"),
            audio_codec=item.get("acodec"),
            video_codec=item.get("vcodec"),
            filesize=item.get("filesize") or item.get("filesize_approx"),
        )
        for item in info.get("formats", [])[:40]
        if item.get("format_id")
    ]

    return MediaPreview(
        url=url,
        title=info.get("title") or "Untitled media",
        thumbnail=info.get("thumbnail"),
        duration_seconds=duration,
        channel=info.get("channel") or info.get("uploader"),
        formats=formats,
    )
