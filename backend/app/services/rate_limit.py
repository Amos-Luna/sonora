import time
from collections import defaultdict

from fastapi import Request, status
from redis import Redis

from app.core.config import get_settings
from app.core.errors import AppError

_memory_buckets: dict[str, list[float]] = defaultdict(list)


def enforce_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    settings = get_settings()
    try:
        redis = Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        count = redis.incr(key)
        if count == 1:
            redis.expire(key, window_seconds)
        if count > limit:
            raise AppError(
                title="Rate limit exceeded",
                detail="Too many requests. Please wait and try again.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                error_type="https://sonora.app/problems/rate-limited",
            )
    except AppError:
        raise
    except Exception:
        now = time.time()
        bucket = [
            timestamp for timestamp in _memory_buckets[key] if now - timestamp < window_seconds
        ]
        bucket.append(now)
        _memory_buckets[key] = bucket
        if len(bucket) > limit:
            raise AppError(
                title="Rate limit exceeded",
                detail="Too many requests. Please wait and try again.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                error_type="https://sonora.app/problems/rate-limited",
            )


def enforce_preview_rate_limit(request: Request) -> None:
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    enforce_rate_limit(
        f"rate:preview:{client_ip}",
        settings.rate_limit_preview_per_minute,
        60,
    )
