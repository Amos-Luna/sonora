"""Shared yt-dlp options for previews and downloads.

YouTube challenges requests from data-center IPs with a "Sign in to confirm
you're not a bot" page. To bypass that we accept the full contents of a
Netscape-formatted cookies.txt (exported from a logged-in browser) as an env
var and feed it to yt-dlp via the ``cookiefile`` option. We also rotate the
``player_client`` to lower the odds of getting blocked on any single client.
"""

import logging
import os
import tempfile
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _materialize_cookies_path() -> str | None:
    cookies_blob = get_settings().youtube_cookies
    if not cookies_blob:
        return None
    fd, path = tempfile.mkstemp(prefix="yt_cookies_", suffix=".txt")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(cookies_blob)
        os.chmod(path, 0o600)
    except Exception:
        logger.exception("Failed to materialize YouTube cookies file")
        return None
    return path


_YOUTUBE_COOKIES_PATH: str | None = _materialize_cookies_path()


def base_ydl_opts() -> dict[str, Any]:
    opts: dict[str, Any] = {
        "noplaylist": True,
        "quiet": True,
        "extractor_args": {
            "youtube": {"player_client": ["web_safari", "ios", "web"]},
        },
    }
    if _YOUTUBE_COOKIES_PATH:
        opts["cookiefile"] = _YOUTUBE_COOKIES_PATH
    return opts
