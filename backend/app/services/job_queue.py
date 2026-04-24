from celery import Celery

from app.core.config import get_settings


def make_celery() -> Celery:
    settings = get_settings()
    return Celery(
        "sonora",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["app.worker"],
    )


celery_app = make_celery()
