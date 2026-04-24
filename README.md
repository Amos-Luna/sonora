# Sonora

Sonora is a smart media download and analysis platform for YouTube content. The MVP includes a Next.js frontend, FastAPI backend, Celery worker, Redis queue, PostgreSQL metadata storage, Dockerized local runtime, health checks, typed APIs and tests.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/health`

## Local Development

Backend:

```bash
cd backend
uv python install 3.12
uv sync --extra dev
uv run uvicorn app.main:create_app --factory --reload
```

Worker:

```bash
cd backend
uv run celery -A app.worker.celery_app worker --loglevel=INFO
```

Frontend:

```bash
cd frontend
corepack enable
pnpm install
pnpm dev
```

Tests:

```bash
cd backend
uv run pytest
```

See `docs/ARCHITECTURE.md` for the system design and production notes.
