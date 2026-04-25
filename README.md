# Sonora

Sonora is a clean, production-shaped MVP that turns a YouTube link into a real file on
your computer.

The product does **one thing very well**:

- Paste a YouTube URL.
- Choose **Video (MP4)** with a resolution (360p / 480p / 720p / 1080p).
- Or choose **Audio** in **MP3** or **WAV**.
- Click once and the file lands in your browser's download folder.

No lyrics, no stems, no BPM, no analysis. Just fast, reliable downloads with a clean UX
and a secure backend.

## Two-layer UX

1. **Landing + Auth layer** (`http://localhost:3000`)
   - Short hero explaining what Sonora does.
   - One card with two tabs: **Login** and **Create account** (email + password with
     show/hide toggle).
2. **Dashboard layer** (same URL, after login)
   - Top bar with the signed-in email and a **Sign out** button.
   - URL input with **Preview** (title, thumbnail, channel, duration).
   - Action selector: **Video (MP4)** or **Audio**.
   - Resolution picker for video, format picker (MP3 / WAV) for audio.
   - A single **Download** button that queues the job.
   - **Recent downloads** list that polls every 4s and shows a **Save file** button as
     soon as each job is `completed`. Clicking it triggers a real browser download via
     an authenticated endpoint.

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8001/docs`
- API health: `http://localhost:8001/health`

The API listens on port `8000` inside Docker and is published to host port `8001` by
default. Change `API_HOST_PORT` in `.env` if you need another host port.

## Public API (summary)

| Method | Path                     | Description                                         |
| ------ | ------------------------ | --------------------------------------------------- |
| GET    | `/health`                | Liveness probe.                                     |
| GET    | `/health/ready`          | Readiness probe (DB + Redis reachable).             |
| POST   | `/auth/signup`           | Create user, returns JWT and sets session cookie.   |
| POST   | `/auth/login`            | Login, returns JWT and sets session cookie.         |
| POST   | `/media/preview`         | Validate URL and return title/thumbnail/duration.   |
| POST   | `/jobs`                  | Queue a `video_download` or `audio_download` job.   |
| GET    | `/jobs`                  | List the current user's jobs.                       |
| GET    | `/jobs/{job_id}`         | Get a single job with status and result metadata.   |
| GET    | `/jobs/{job_id}/download`| Stream the generated file with `attachment`.        |

All `/jobs*` routes are authenticated via Bearer token or the `sonora_session` cookie.

### Job payloads

Video:

```json
{
  "source_url": "https://www.youtube.com/watch?v=...",
  "action": "video_download",
  "options": { "quality": "720" }
}
```

Audio:

```json
{
  "source_url": "https://www.youtube.com/watch?v=...",
  "action": "audio_download",
  "options": { "format": "mp3" }
}
```

The server validates options: video is always MP4 and `quality` must be one of
`360 / 480 / 720 / 1080`; audio `format` must be `mp3` or `wav`.

## Local Development (without Docker)

Backend API:

```bash
cd backend
uv python install 3.12
uv sync --extra dev
uv run uvicorn app.main:create_app --factory --reload
```

Celery worker (in another shell):

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

You need Redis and Postgres running. The easiest path is to keep using
`docker compose up redis postgres` and run the Python/Node processes locally against
them.

## Tests

```bash
cd backend
uv run pytest
```

## Project layout

```text
sonora/
├── frontend/         # Next.js 16 + TailwindCSS (Landing + Dashboard)
├── backend/          # FastAPI API + Celery worker
├── docs/             # Architecture notes
├── infra/            # Docker-related configs
├── docker-compose.yml
└── .env.example
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the system design, runtime
diagram, auth flow, job lifecycle and production notes.
