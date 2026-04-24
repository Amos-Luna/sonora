from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings


def ensure_local_storage() -> Path:
    settings = get_settings()
    settings.local_storage_path.mkdir(parents=True, exist_ok=True)
    return settings.local_storage_path


def allocate_output_path(extension: str) -> Path:
    safe_extension = extension.lower().lstrip(".") or "bin"
    return ensure_local_storage() / f"{uuid4()}.{safe_extension}"


def public_file_url(path: Path) -> str:
    settings = get_settings()
    # Local MVP mode exposes metadata only; production should replace this with signed R2/S3 URLs.
    return f"{str(settings.public_base_url).rstrip('/')}/files/{path.name}"
