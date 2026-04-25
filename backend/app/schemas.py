from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class UserRoleSchema(StrEnum):
    owner = "owner"
    guest = "guest"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    role: UserRoleSchema

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PreviewRequest(BaseModel):
    url: HttpUrl


class MediaFormat(BaseModel):
    format_id: str
    extension: str | None = None
    resolution: str | None = None
    audio_codec: str | None = None
    video_codec: str | None = None
    filesize: int | None = None


class MediaPreview(BaseModel):
    url: HttpUrl
    title: str
    thumbnail: str | None = None
    duration_seconds: int | None = None
    channel: str | None = None
    formats: list[MediaFormat] = Field(default_factory=list)


class JobAction(StrEnum):
    video_download = "video_download"
    audio_download = "audio_download"


class JobStatus(StrEnum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


VIDEO_QUALITIES = {"360", "480", "720", "1080"}
AUDIO_FORMATS = {"mp3", "wav"}


class JobCreate(BaseModel):
    source_url: HttpUrl
    action: JobAction
    options: dict[str, Any] = Field(default_factory=dict)

    @field_validator("options")
    @classmethod
    def validate_options_size(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(str(value)) > 4000:
            raise ValueError("Options payload is too large.")
        return value

    @field_validator("options")
    @classmethod
    def normalize_options(cls, value: dict[str, Any], info: Any) -> dict[str, Any]:
        action = info.data.get("action")
        if action == JobAction.video_download:
            quality = str(value.get("quality", "720"))
            if quality not in VIDEO_QUALITIES:
                raise ValueError(
                    f"Quality must be one of {sorted(VIDEO_QUALITIES)} for video downloads."
                )
            return {"format": "mp4", "quality": quality}
        if action == JobAction.audio_download:
            audio_format = str(value.get("format", "mp3")).lower()
            if audio_format not in AUDIO_FORMATS:
                raise ValueError(f"Audio format must be one of {sorted(AUDIO_FORMATS)}.")
            normalized: dict[str, Any] = {"format": audio_format}
            if audio_format == "mp3":
                normalized["bitrate"] = str(value.get("bitrate", "192"))
            return normalized
        return value


class JobResponse(BaseModel):
    id: str
    action: JobAction
    status: JobStatus
    source_url: str
    title: str | None
    progress: int
    options: dict[str, Any]
    result: dict[str, Any] | None
    error_message: str | None

    model_config = ConfigDict(from_attributes=True)


class InviteCreate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    expires_in_hours: int | None = Field(default=None, ge=1, le=24 * 30)
    max_uses: int | None = Field(default=None, ge=1, le=100)


class InviteResponse(BaseModel):
    id: str
    label: str | None
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    max_uses: int
    used_count: int
    is_active: bool
    url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InviteRedeemResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
