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

## Access model (single-owner + invites)

Sonora is **single-user by design**. There is no public signup.

- Exactly one **owner** account signs in with email + password. The owner is seeded
  from the `OWNER_EMAIL` / `OWNER_PASSWORD` env vars on first startup.
- Guests (family, friends, collaborators) enter through **invite links** that the
  owner generates from the dashboard. Each invite has a **TTL**, a **max uses** limit,
  and can be **revoked** at any time.
- Opening an invite link (e.g. `/invite/<token>`) creates a short-lived guest session
  — no password, no email needed. Guests can preview and download but cannot create
  or see other invites.

## Two-layer UX

1. **Landing + Auth layer** (`http://localhost:3000`)
   - Short hero explaining what Sonora does.
   - One card with **owner login only** (email + password with show/hide toggle).
2. **Dashboard layer** (same URL, after login or redeem)
   - Top bar with the signed-in identity and a **Sign out** button.
   - URL input with **Preview** (title, thumbnail, channel, duration).
   - Action selector: **Video (MP4)** or **Audio**.
   - Resolution picker for video, format picker (MP3 / WAV) for audio.
   - A single **Download** button that queues the job.
   - **Recent downloads** list that polls every 4s and shows a **Save file** button as
     soon as each job is `completed`. Clicking it triggers a real browser download via
     an authenticated endpoint.
   - **Owner-only**: an **Invites** panel to create, copy, share and revoke invite
     links.

## Quick Start

```bash
cp .env.example .env
# Edit .env and set OWNER_EMAIL and a strong OWNER_PASSWORD
docker compose up --build
```

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8001/docs`
- API health: `http://localhost:8001/health`

The API listens on port `8000` inside Docker and is published to host port `8001` by
default. Change `API_HOST_PORT` in `.env` if you need another host port.

On first startup, the API seeds the owner account from `OWNER_EMAIL` / `OWNER_PASSWORD`.
If you later change `OWNER_PASSWORD`, the next restart rotates the stored hash to
match. The owner account is always promoted to `role=owner` and kept active.

## Public API (summary)

| Method | Path                         | Auth        | Description                                          |
| ------ | ---------------------------- | ----------- | ---------------------------------------------------- |
| GET    | `/health`                    | public      | Liveness probe.                                      |
| GET    | `/health/ready`              | public      | Readiness probe (DB + Redis reachable).              |
| POST   | `/auth/login`                | public      | Owner login (email + password).                      |
| POST   | `/auth/logout`               | session     | Clear the session cookie.                            |
| GET    | `/auth/me`                   | session     | Current user (owner or guest).                       |
| POST   | `/media/preview`             | session     | Validate URL and return title / thumbnail / duration.|
| POST   | `/jobs`                      | session     | Queue `video_download` or `audio_download`.          |
| GET    | `/jobs`                      | session     | List the current user's jobs.                        |
| GET    | `/jobs/{job_id}`             | session     | Get a single job with status and result metadata.    |
| GET    | `/jobs/{job_id}/download`    | session     | Stream the generated file (`Content-Disposition`).   |
| POST   | `/invites`                   | owner only  | Create an invite link.                               |
| GET    | `/invites`                   | owner only  | List invites (active and historic).                  |
| DELETE | `/invites/{invite_id}`       | owner only  | Revoke an invite.                                    |
| POST   | `/invites/{token}/redeem`    | public      | Exchange an invite token for a guest session.        |

All session-protected routes accept a Bearer token or the `sonora_session` cookie.
Invite redemption is rate-limited per IP.

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

### Inviting someone

As the owner, open the dashboard and use the **Invites** panel:

1. (Optional) set a label, a TTL in hours, and a max-uses count.
2. Click **New invite** to generate a URL like `http://localhost:3000/invite/<token>`.
3. Copy it and send it to the guest (WhatsApp, email, etc.).
4. When the guest opens the link, their browser exchanges the token for a guest
   session and drops them directly on the dashboard. They can download, but they
   cannot see or manage invites.
5. Revoke an invite any time from the same panel.

Invites are single-use by default and expire in 24 hours by default (configurable
via env). The plaintext token is only shown once, right after creation.

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
