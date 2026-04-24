from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None

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
    lyrics = "lyrics"
    stems = "stems"
    music_analysis = "music_analysis"
    beat_detection = "beat_detection"
    metadata = "metadata"


class JobStatus(StrEnum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


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
