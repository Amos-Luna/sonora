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

# Access model: single owner + invites

Sonora is intentionally **single-user**. There is no public signup, ever.

- There is exactly one **owner** account. Its email and password are seeded from env
  vars (`OWNER_EMAIL`, `OWNER_PASSWORD`). On each startup an idempotent routine
  promotes that user to `role=owner` and re-hashes the password if it changed.
- Only the owner can log in with email + password.
- Guests (family, friends, collaborators) enter through **invite links** that the
  owner issues from the dashboard. An invite:
  - is a 32-byte random token rendered as `/invite/<token>`;
  - is stored in the database only as a SHA-256 hash;
  - has a TTL in hours (default 24, max 336);
  - has a max-uses count (default 1);
  - can be revoked at any time.
- Redeeming an invite creates a guest user (`role=guest`, synthetic email,
  `invited_by_id = owner.id`) and issues a JWT + session cookie. Guests can preview
  and download media but cannot see or manage invites (HTTP 403).

# Product UX: two layers

The web app is intentionally split in two layers to keep the flow crisp.

## Layer 1 — Landing + Auth

- Short hero that explains what Sonora does in one sentence.
- Minimal copy. No noisy feature grid.
- A single auth card: **owner-only Login** with email + password.
  - Password has a show/hide toggle.
  - No sign-up form. Nobody can self-register.
- Guests do not see this layer — they open `/invite/<token>` directly and are
  redirected to the dashboard after a brief "opening your access…" screen.

The dashboard is **never** visible until the user has a session.

## Layer 2 — Dashboard (post-auth)

- Top bar: Sonora brand, current identity (email for owner, label for guest) and
  **Sign out**.
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
- **Owner-only Invites panel**: create a new invite (label, TTL hours, max uses),
  see the active link right after creation with a Copy button, and revoke any
  existing invite. Guests do not render this panel and are rejected server-side if
  they try to call the endpoints.

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

- Owner logs in with email + password. No other account can log in with credentials.
- Guests obtain a session by redeeming an invite link issued by the owner. No
  password is ever set for guests.
- JWT issued at login and redeem, also set as an HTTP-only `sonora_session` cookie
  on the API origin.
- The JWT is used for XHR; the cookie is used for direct browser navigation (e.g.
  clicking the download link).
- `Secure` cookie in production (`SONORA_ENV=production`).

Future:

- TOTP (Google Authenticator) as a second factor for the owner.
- Gmail OAuth for the owner only (Supabase / Clerk / Auth.js).
- Per-IP audit trail of invite redemptions.
- Optional subscription / credits model (would require re-evaluating the
  single-owner model).

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

| Method | Path                          | Auth        | Purpose                                     |
| ------ | ----------------------------- | ----------- | ------------------------------------------- |
| GET    | `/health`                     | public      | Liveness                                    |
| GET    | `/health/ready`               | public      | Readiness (DB + Redis)                      |
| POST   | `/auth/login`                 | public      | Owner login, returns JWT + sets cookie      |
| POST   | `/auth/logout`                | session     | Clears the session cookie                   |
| GET    | `/auth/me`                    | session     | Current user (owner or guest)               |
| POST   | `/media/preview`              | session     | Validate URL, return preview metadata       |
| POST   | `/jobs`                       | session     | Queue `video_download` or `audio_download`  |
| GET    | `/jobs`                       | session     | List current user's jobs                    |
| GET    | `/jobs/{job_id}`              | session     | Get job status + result metadata            |
| GET    | `/jobs/{job_id}/download`     | session     | Stream the generated file (attachment)      |
| POST   | `/invites`                    | owner only  | Create an invite link                       |
| GET    | `/invites`                    | owner only  | List invites                                |
| DELETE | `/invites/{invite_id}`        | owner only  | Revoke an invite                            |
| POST   | `/invites/{token}/redeem`     | public*     | Exchange an invite token for a guest session|

\* `/invites/{token}/redeem` is public but rate-limited per IP.

Job options are validated server-side:

- Video → `{ format: "mp4", quality: "360" | "480" | "720" | "1080" }`
- Audio → `{ format: "mp3" | "wav", bitrate?: "192" }`

Invalid combinations return HTTP 422 with a structured problem response.

Invite payloads:

- Create → `{ label?, expires_in_hours?, max_uses? }` with server-side clamping.
- Redeem → no body; returns `{ access_token, token_type, user }` and sets the
  session cookie.

---

# Security Requirements

- bcrypt-hashed passwords (pinned `<5`), 72-byte input guard.
- Owner seeded from env, `role=owner` enforced, hash rotated on password change.
- Public signup disabled (`/auth/signup` does not exist).
- Invite tokens: 32 random bytes, stored only as SHA-256 hash, single-use by
  default, TTL-bounded, revocable, rate-limited redemption per IP.
- JWT signed with a rotating `JWT_SECRET` (never ship the example value).
- HTTP-only, SameSite=Lax, `Secure` in production session cookie.
- CORS locked to explicit origins via `API_CORS_ORIGINS`.
- Rate limiting on the preview endpoint and invite redeem (Redis-backed with
  in-memory fallback).
- Non-root container user (`sonora`) for API and worker.
- Ownership check on every job read and on the download route; `require_owner`
  dependency on every invite-management route.
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
- Single-owner auth: owner seeded from env, JWT + cookie session.
- Invite system: create / list / revoke / redeem with rate-limited redemption.
- Preview + job pipeline with yt-dlp and FFmpeg.
- Two-layer UX: owner-only Landing/Auth → Dashboard, `/invite/<token>` for guests.
- Video (MP4, 360–1080p) and Audio (MP3 / WAV) downloads.
- Authenticated file delivery with `Content-Disposition: attachment`.
- Health + readiness endpoints, Dockerized runtime.

## Phase 2 — Production hardening

- TOTP (Google Authenticator) as second factor for the owner.
- Alembic migrations.
- Cloudflare R2 / S3 + signed URLs + file TTL.
- Sentry, structured logs, metrics, dashboards.
- Per-user rate limits for `/jobs`.
- QR rendering of invite URLs directly in the dashboard.
- Per-IP audit trail of invite redemptions.

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
