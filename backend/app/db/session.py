from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def _normalize_database_url(url: str) -> str:
    """Make sure SQLAlchemy uses the psycopg v3 driver.

    Managed Postgres providers (Railway, Render, Fly, Neon, Supabase, Heroku)
    expose URLs as ``postgres://`` or ``postgresql://``. SQLAlchemy 2.x with
    ``psycopg`` v3 requires the explicit ``postgresql+psycopg://`` prefix.
    """
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


settings = get_settings()

engine = create_engine(
    _normalize_database_url(settings.database_url),
    pool_pre_ping=True,
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
