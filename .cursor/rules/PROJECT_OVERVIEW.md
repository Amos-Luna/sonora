# Project: Smart Media Download Platform — SONORA

## General Objective

Build a modern, elegant and scalable web platform (startup SaaS style) where users
securely authenticate, paste a YouTube link, and download the content in a real file
on their device.

This MVP focuses on **one** core purpose:

> Download media from YouTube in a simple, fast, reliable and production-ready way.

Users must be able to:

- paste a YouTube link
- choose **Video** or **Audio**
- if Video: choose the resolution (MP4 only in MVP)
- if Audio: choose the format (MP3 or WAV in MVP)
- download the final processed file directly to their computer

Nothing else.

**Explicitly out of scope for MVP:**

- No lyrics extraction
- No BPM / key detection
- No stem separation
- No music analysis
- No metadata enrichment
- No playlists or multi-source ingestion

The goal is a clean MVP with excellent UX, strong backend architecture, and real
startup-quality execution.

---

# Product UX: two layers

The web app is intentionally split in two layers to keep the flow crisp.

## Layer 1 — Landing + Auth

- Short hero that explains what Sonora does in one sentence.
- Minimal copy. No noisy feature grid.
- A single auth card with two tabs: **Login** and **Create account**.
  - Email + password, password has a show/hide toggle.
  - Validation: password ≥ 10 characters at signup.
  - Clear error message if an email is already registered.

The dashboard is **never** visible until the user has a session.

## Layer 2 — Dashboard (post-auth)

- Top bar: Sonora brand, user email, **Sign out**.
- URL input with a **Preview** button that fetches title, thumbnail, channel and
  duration.
- Action selector with exactly two options: **Video (MP4)** or **Audio**.
- Option picker:
  - Video: resolution chips (360p / 480p / 720p / 1080p).
  - Audio: format chips (MP3 / WAV).
- One primary button that queues the job and labels itself with the chosen option
  (e.g. `Download Video 720p`, `Download Audio MP3`).
- **Recent downloads** list that polls the API every ~4s. Each completed job shows a
  **Save file** button which is an authenticated download link — clicking it saves
  the file to the user's browser download folder via `Content-Disposition:
  attachment`.

Visual language: dark background, violet accent, rounded 2xl cards, generous
spacing. Premium and quiet, not flashy.

---

# Deployment Strategy (Recommended)

Because Sonora depends on FFmpeg and yt-dlp, pure serverless is not a good fit for
the backend.

## Frontend

- **Vercel** (Next.js native, previews, great DX).

## Backend

- FastAPI in Docker, deployed on **Railway** (MVP choice). Render or Fly.io are fine
  alternatives.
- Celery worker deployed as a second container from the same image.

## Queue

- **Redis** (managed add-on on the chosen platform).

## Database

- **PostgreSQL** (managed add-on).

## Storage

- MVP: local media volume mounted into the API + worker containers.
- Production: **Cloudflare R2** (preferred) or **AWS S3**, with short-lived signed
  URLs returned from the authenticated download endpoint.

---

# Repository Structure (Monorepo)

```text
sonora/
├── frontend/        # Next.js 16, TypeScript, TailwindCSS
├── backend/         # FastAPI API + Celery worker
├── docs/            # Architecture notes
├── infra/           # Docker-related configs
├── scripts/
└── docker-compose.yml
```

One repo, one deploy story.

---

# Expected Stack

## Backend

- Python 3.12
- FastAPI
- SQLAlchemy + PostgreSQL
- Celery + Redis
- yt-dlp + FFmpeg
- bcrypt for password hashing, JWT for sessions
- Docker + `uv` for dependency management
- Pydantic settings, structured errors (RFC 7807 style), health + readiness probes

Deployment: Dockerized FastAPI, Railway (or equivalent).

## Frontend

- Next.js 16 (App Router)
- TypeScript
- TailwindCSS
- Lucide icons
- Hand-rolled components; `shadcn/ui` allowed but not required for MVP
- Fully responsive

Deployment: Vercel.

---

# Main User Flow

## 1. Authentication

- Email + password (MVP).
- JWT issued at signup/login, also set as an HTTP-only `sonora_session` cookie on
  the API origin.
- The JWT is used for XHR; the cookie is used for direct browser navigation (e.g.
  clicking the download link).
- `Secure` cookie in production (`SONORA_ENV=production`).

Future:

- Gmail OAuth (Supabase / Clerk / Auth.js).
- Email verification.
- Optional subscription / credits model.

## 2. Link Input

The user pastes a YouTube video or Shorts URL. The backend:

- validates it is a supported source,
- rate-limits the preview per user,
- returns `{ title, thumbnail, duration_seconds, channel, formats[] }`.

Future sources: SoundCloud, TikTok, playlists.

## 3. Core Features

### A. Video Download (MVP)

- Format: **MP4** only.
- Resolutions: **360p / 480p / 720p / 1080p**.
- The worker prefers MP4 streams and merges to MP4 via FFmpeg.

Future: MKV / MOV, 2K / 4K if available.

### B. Audio Download (MVP)

- Formats: **MP3** or **WAV**.
- MP3 ships at 192 kbps; WAV is lossless PCM 48 kHz stereo.

Future: FLAC, AAC, M4A.

## 4. Delivery

- Files are generated on the worker with UUID names inside a private volume.
- The API exposes `GET /jobs/{id}/download` which:
  - checks ownership,
  - checks status is `completed`,
  - returns a `FileResponse` with `Content-Disposition: attachment` and a sanitized
    human-friendly filename based on the job title.

There is **no** public static mount for generated files.

---

# Dashboard Requirements

- Recent downloads list (last 50 per user).
- For each job: title, action + format summary, status badge, error message (if
  any).
- `Save file` action only appears when the job is `completed`.
- Live status updates (polling in MVP, websockets optional later).

Clean, minimal, useful. No dead UI.

---

# API Contract (MVP)

| Method | Path                      | Auth | Purpose                                   |
| ------ | ------------------------- | ---- | ----------------------------------------- |
| GET    | `/health`                 | no   | Liveness                                  |
| GET    | `/health/ready`           | no   | Readiness (DB + Redis)                    |
| POST   | `/auth/signup`            | no   | Create user, return JWT + set cookie      |
| POST   | `/auth/login`             | no   | Login, return JWT + set cookie            |
| POST   | `/media/preview`          | yes  | Validate URL, return preview metadata     |
| POST   | `/jobs`                   | yes  | Queue `video_download` or `audio_download`|
| GET    | `/jobs`                   | yes  | List current user's jobs                  |
| GET    | `/jobs/{job_id}`          | yes  | Get job status + result metadata          |
| GET    | `/jobs/{job_id}/download` | yes  | Stream the generated file (attachment)    |

Job options are validated server-side:

- Video → `{ format: "mp4", quality: "360" | "480" | "720" | "1080" }`
- Audio → `{ format: "mp3" | "wav", bitrate?: "192" }`

Invalid combinations return HTTP 422 with a structured problem response.

---

# Security Requirements

- bcrypt-hashed passwords (pinned `<5`), 72-byte input guard.
- JWT signed with a rotating `JWT_SECRET` (never ship the example value).
- HTTP-only, SameSite=Lax, `Secure` in production session cookie.
- CORS locked to explicit origins via `API_CORS_ORIGINS`.
- Rate limiting on the preview endpoint (Redis-backed, in-memory fallback).
- Non-root container user (`sonora`) for API and worker.
- Owner check on every job read and on the download route.
- Structured logs and problem-details error responses.
- File delivery via authenticated endpoint, never an open static mount.
- Signed URLs + file expiration once storage moves to R2 / S3.

Do not ship an insecure MVP.

---

# UX / UI

Sonora must feel like:

- a serious startup
- a premium product
- clean, minimal, elegant, fast, intuitive

Avoid the "university project" look. One primary action per screen. No clutter.

---

# Delivery Roadmap

## Phase 1 — MVP (current)

- Monorepo scaffolding (frontend, backend, worker, infra, docs).
- Email + password auth, JWT + cookie session.
- Preview + job pipeline with yt-dlp and FFmpeg.
- Two-layer UX: Landing/Auth → Dashboard.
- Video (MP4, 360–1080p) and Audio (MP3 / WAV) downloads.
- Authenticated file delivery with `Content-Disposition: attachment`.
- Health + readiness endpoints, Dockerized runtime.

## Phase 2 — Production hardening

- Alembic migrations.
- Cloudflare R2 / S3 + signed URLs + file TTL.
- Gmail OAuth + email verification.
- Sentry, structured logs, metrics, dashboards.
- Per-user rate limits for `/jobs`.
- Billing-ready user model (plans, credits).

## Phase 3 — Growth

- Playlists, Shorts, SoundCloud, TikTok.
- Extra formats (MKV, MOV, FLAC, M4A, AAC) and 2K / 4K where available.
- Optional WebSocket progress updates.
- Referral / share features.
- Monetization.

---

# Important Rule

This is not a toy MVP. Every technical decision must be justified as if we were
building a real company.

Prioritize:

- intelligent simplicity
- low cost
- future scalability
- excellent UX
- clean architecture
- execution speed

The goal is not just something that works — it is something clean, reliable and
ready for real users.
