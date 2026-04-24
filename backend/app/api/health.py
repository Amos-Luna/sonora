from time import perf_counter

from fastapi import APIRouter
from redis import Redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "sonora-api"}


@router.get("/ready")
def readiness() -> dict[str, object]:
    settings = get_settings()
    checks: dict[str, object] = {}
    started_at = perf_counter()

    try:
        with SessionLocal() as db:
            assert isinstance(db, Session)
            db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = {"status": "error", "detail": str(exc)}

    try:
        Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2).ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = {"status": "error", "detail": str(exc)}

    healthy = all(value == "ok" for value in checks.values())
    return {
        "status": "ready" if healthy else "degraded",
        "checks": checks,
        "latency_ms": round((perf_counter() - started_at) * 1000, 2),
    }
