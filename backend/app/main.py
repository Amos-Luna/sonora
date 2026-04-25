import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, health, invites, jobs, media
from app.core.config import get_settings
from app.core.errors import install_exception_handlers
from app.db.models import Base
from app.db.session import SessionLocal, engine
from app.services.bootstrap import ensure_owner_user
from app.services.storage import ensure_local_storage

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        Base.metadata.create_all(bind=engine)
        ensure_local_storage()
        settings = get_settings()
        with SessionLocal() as db:
            ensure_owner_user(db, settings)
    except Exception:
        logger.exception("Failed to initialize database, storage or owner account")
        raise
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Sonora API",
        version="0.1.0",
        description="API for secure media preview, download jobs and music analysis workflows.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(media.router)
    app.include_router(jobs.router)
    app.include_router(invites.router)
    return app


app = create_app()
