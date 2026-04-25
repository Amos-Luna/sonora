# Sonora — Deploy Guide (Railway + Vercel)

This is the production deploy path for Sonora's MVP:

- **Frontend (Next.js 16)** → **Vercel** (free tier).
- **Backend (FastAPI + Celery worker + Postgres + Redis + media volume)** →
  **Railway** (~ $5–10 / month with the free trial credit).

The whole thing takes about **30–45 minutes** the first time.

---

## 0. Prerequisites

- A GitHub account with this repo pushed (`origin`).
- A [Railway](https://railway.com) account (sign up with GitHub).
- A [Vercel](https://vercel.com) account (sign up with GitHub).
- The repo already includes everything you need:
  - `backend/Dockerfile` — installs FFmpeg, yt-dlp deps and runs as non-root.
  - `backend/railway.json` — start command + healthcheck for Railway.
  - `frontend/` — Next.js app, Vercel-native.

## 1. Generate the production secrets (do this once, locally)

You need two values that **must not** match the example `.env`:

```bash
# JWT signing key — 64 random hex chars
openssl rand -hex 32

# Owner password — 32 random urlsafe chars (pick whichever works)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# or, if you don't have Python installed:
openssl rand -base64 24 | tr -d '/+=' | cut -c1-32
```

> macOS only ships `python3`, not `python`. If you typed `python` and got
> `command not found`, just use `python3` — same result.

Save both values in a password manager. You will paste them into Railway in
step 3.

> **Never commit these.** They live only in Railway's variables panel.

---

## 2. Deploy the backend on Railway

### 2.1. Create the project

1. Open <https://railway.com/new>.
2. Click **Deploy from GitHub repo** → pick your `sonora` repo.
3. Railway will try to autodetect a service. **Cancel the autodetect** and start
   from an empty project (the "+" → **Empty Project** flow). We will add the
   four pieces explicitly.

### 2.2. Add Postgres

1. In the Railway project canvas: **+ New** → **Database** → **Add PostgreSQL**.
2. Wait ~20 s. You now have a `Postgres` service that auto-exposes a
   `DATABASE_URL` variable to other services in the project via
   [reference variables](https://docs.railway.com/guides/variables#reference-variables).

### 2.3. Add Redis

1. **+ New** → **Database** → **Add Redis**.
2. Same deal: it exposes `REDIS_URL` automatically.

### 2.4. Add the `api` service (FastAPI)

> **Before you start**: make sure Railway's GitHub App can see your repo.
> Open <https://github.com/settings/installations>, click **Configure** on
> the "Railway" entry and grant access to `sonora` (or to all repos). If
> "Railway" is not in the list, go to Railway → your avatar → **Account
> Settings → Integrations → GitHub → Configure** — that flow always sends
> you to the correct install page for the current version of the App.
>
> If you skip this, Railway will create the service and then show a red
> **"GitHub Repo not found"** banner even if the repo is public — Railway
> clones via the App, not via the public URL.

1. **+ New** → **GitHub Repo** → pick the `sonora` repo again.
2. In the new service:
   - **Settings → Source → Add Root Directory**: `backend`
   - **Settings → Build → Builder**: `Dockerfile` (auto-detected via
     `backend/railway.json`).
   - **Settings → Networking → Generate Domain** → you will get something like
     `sonora-api-production.up.railway.app`. Copy this URL — you'll use it for
     the frontend.
3. **Settings → Volumes → + New Volume**:
   - Mount path: `/data/media`
   - Size: 5 GB is plenty for the MVP (you can grow it later).
   This is the persistent disk where the worker writes the generated MP4 / MP3
   / WAV files.

### 2.5. Add the `worker` service (Celery)

The worker uses the **same Docker image** as the api but with a different start
command.

1. **+ New** → **GitHub Repo** → same repo.
2. In the new service:
   - **Settings → Source → Root Directory**: `backend`
   - **Settings → Deploy → Custom Start Command**:
     ```text
     celery -A app.worker.celery_app worker --loglevel=INFO
     ```
     This overrides the start command from `railway.json`.
   - **Settings → Networking**: leave it private (no public domain — the worker
     never receives HTTP traffic).
3. **Volumes → + Attach existing volume**: attach the **same** volume you
   created in 2.4, mounted at `/data/media`. The worker writes the files and
   the api reads them, so they must share the disk.

### 2.6. Set the environment variables (api **and** worker)

Open the **Variables** tab on each service. The values for `DATABASE_URL` and
`REDIS_URL` are pulled with reference syntax `${{Postgres.DATABASE_URL}}` and
`${{Redis.REDIS_URL}}` — Railway autocompletes them while you type.

Both services share the same variables. The easiest way is to use Railway's
**"Shared Variables"** feature at the project level, but a manual copy works
fine too.

| Variable                          | Value                                                       |
| --------------------------------- | ----------------------------------------------------------- |
| `APP_ENV`                         | `production`                                                |
| `DATABASE_URL`                    | `${{Postgres.DATABASE_URL}}`                                |
| `REDIS_URL`                       | `${{Redis.REDIS_URL}}`                                      |
| `JWT_SECRET`                      | the value from step 1                                       |
| `JWT_ISSUER`                      | `sonora`                                                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES`     | `60`                                                        |
| `OWNER_EMAIL`                     | your real email                                             |
| `OWNER_PASSWORD`                  | the value from step 1                                       |
| `OWNER_FULL_NAME`                 | your name                                                   |
| `INVITE_DEFAULT_TTL_HOURS`        | `24`                                                        |
| `INVITE_MAX_TTL_HOURS`            | `336`                                                       |
| `INVITE_DEFAULT_MAX_USES`         | `1`                                                         |
| `INVITE_REDEEM_PER_MINUTE`        | `20`                                                        |
| `RATE_LIMIT_PREVIEW_PER_MINUTE`   | `12`                                                        |
| `MAX_MEDIA_DURATION_SECONDS`      | `1800`                                                      |
| `STORAGE_BACKEND`                 | `local`                                                     |
| `LOCAL_STORAGE_PATH`              | `/data/media`                                               |
| `PUBLIC_BASE_URL`                 | `https://sonora-api-production.up.railway.app` (your api's domain) |
| `FRONTEND_BASE_URL`               | _filled in step 4_ — your Vercel URL                        |
| `API_CORS_ORIGINS`                | _filled in step 4_ — your Vercel URL (comma-separated)      |

> Important: `PUBLIC_BASE_URL` must be **HTTPS**, not HTTP. Railway gives you
> HTTPS by default once you generate the domain.

### 2.7. Trigger the first deploy

After saving the variables, Railway redeploys both services automatically.

Watch the api logs:

- You should see `Uvicorn running on http://0.0.0.0:<port>`.
- Then `ensure_owner_user` runs once and creates / promotes the owner.
- The healthcheck `GET /health` should return `200` within 10 s.

If the worker logs show `celery@... ready.`, you're good.

Smoke test the api:

```bash
curl https://sonora-api-production.up.railway.app/health
# {"status":"ok","service":"sonora-api"}

curl https://sonora-api-production.up.railway.app/health/ready
# {"status":"ready","checks":{"database":"ok","redis":"ok"},...}
```

If `database` or `redis` is `error`, double-check the reference variables.

---

## 3. Deploy the frontend on Vercel

1. Open <https://vercel.com/new>.
2. Import the `sonora` GitHub repo.
3. **Root Directory**: `frontend`.
4. **Framework Preset**: Next.js (autodetected).
5. **Build & Output Settings**: leave the defaults (`pnpm` is detected from
   `packageManager`).
6. **Environment Variables** → add:
   - `NEXT_PUBLIC_API_BASE_URL` = the **exact** api domain you generated in
     step 2.4 (e.g. `https://sonora-production.up.railway.app`). **No trailing
     slash.** Do NOT copy the placeholder from this guide — use your own
     Railway domain.
7. Click **Deploy**.

After ~1 min you get a URL like `https://sonora-seven.vercel.app/`.

> Heads-up: in Next.js, `NEXT_PUBLIC_*` variables are **inlined at build
> time**. If you change the value later, you must **redeploy** (Vercel →
> Deployments → ⋯ → Redeploy) — just saving the variable does not update the
> already-built JS bundle.

---

## 4. Wire-up: tell the backend about the frontend

Go back to Railway → both `api` and `worker` services → **Variables**:

- `FRONTEND_BASE_URL` = `https://sonora-seven.vercel.app/`
- `API_CORS_ORIGINS` = `https://sonora-seven.vercel.app/`

If you also want to allow Vercel preview deployments (recommended), append them
comma-separated, e.g.:

```text
https://sonora-web.vercel.app,https://sonora-web-git-main-yourname.vercel.app
```

> CORS in this app is strict (whitelist, no wildcards) and the session cookie
> uses `SameSite=Lax` + `Secure`. The frontend domain **must** match exactly.

Railway redeploys the api on save. Done.

---

## 5. End-to-end smoke test

1. Open the Vercel URL.
2. Log in with `OWNER_EMAIL` / `OWNER_PASSWORD`.
3. Paste a short YouTube URL → click **Preview** → confirm the title and
   thumbnail render.
4. Click **Download Audio MP3** (or whatever).
5. Wait ~10–30 s, the job should turn `completed` in the recent-downloads list.
6. Click **Save file**. The browser should download the actual `.mp3`.
7. Open the **Invites** panel → create an invite for 24h / 1 use → open the
   `/invite/<token>` URL in an incognito window → confirm the guest lands on
   the dashboard with no invites panel.

If all six steps pass, you have a real production deploy.

---

## 6. What it costs (real numbers, MVP traffic)

Railway is pay-per-use, billed by the second on RAM + CPU + egress.

| Component   | Typical usage          | Monthly cost |
| ----------- | ---------------------- | ------------ |
| api         | 256–512 MB RAM, idle   | ~$2          |
| worker      | 256 MB RAM, idle       | ~$2          |
| Postgres    | shared, <1 GB          | ~$1          |
| Redis       | shared, tiny           | <$1          |
| Volume 5 GB | flat                   | ~$1          |
| **Total**   |                        | **~$5–8**    |

The Hobby plan includes **$5 of free usage every month**, so for a single-owner
MVP you'll often pay $0–3 out of pocket. Vercel is free.

If you start hitting the free limit, the next cheapest move is replacing the
local volume with **Cloudflare R2** (free egress, basically free at this
scale), which is already on the roadmap (`docs/ARCHITECTURE.md`, "Production
notes").

---

## 7. Troubleshooting cheat-sheet

| Symptom                                          | Likely cause / fix                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Railway shows "GitHub Repo not found" after import | Railway's GitHub App lacks access to this repo. Fix it at <https://github.com/settings/installations> (**Configure** on "Railway" → grant access to the repo), or from Railway: avatar → **Account Settings → Integrations → GitHub → Configure**. |
| `'${PORT:-8000}' is not a valid integer` on boot   | Railway runs the start command as argv (no shell), so bash expansions don't work. `backend/railway.json` wraps it in `sh -c '...'` to force a shell — make sure you have the latest version of that file. |
| api crashes with `Can't load plugin: postgresql` | `DATABASE_URL` is missing the driver. The repo normalizes this in `db/session.py`; re-deploy.    |
| api boots but `/health/ready` says `database: error` | The api is not on the same Railway project as Postgres, or the reference variable is wrong.   |
| Worker logs `Connection refused` on Redis        | `REDIS_URL` not set on the worker. Reference variables are per-service, not project-wide.        |
| Login works but every other call is CORS-blocked | `API_CORS_ORIGINS` doesn't exactly match the Vercel domain (https vs http, trailing slash, etc). |
| `Save file` returns 401 in production            | Cookie is `Secure` in prod and the api domain is HTTP. Make sure `PUBLIC_BASE_URL` is HTTPS.     |
| Worker downloads succeed but the api 404s on file | Volume not mounted on **both** services at `/data/media`. Re-attach the same volume.            |
| "Failed to extract player response" (yt-dlp)     | yt-dlp ships in the image. Bump the dependency in `backend/pyproject.toml` and redeploy.         |
| Build OOMs on Railway                            | Bump the service plan to the next tier or split the Docker layer cache (rare for this image).    |

---

## 8. Day-2 ops

- **Updates**: every push to `main` triggers a redeploy on both Railway
  services and on Vercel. Use a feature branch + Vercel preview to test changes.
- **Secrets rotation**: change `JWT_SECRET` in Railway → all existing sessions
  are invalidated, users re-login. Change `OWNER_PASSWORD` → on next boot the
  hash is rotated by `ensure_owner_user`.
- **Logs**: Railway → service → **Logs**. Vercel → project → **Logs**.
- **Backups**: enable Railway's automatic Postgres backups (Database service
  → **Backups**). Free on Hobby.
- **Custom domain**: both Railway and Vercel let you attach a domain in two
  clicks. After that, update `PUBLIC_BASE_URL`, `FRONTEND_BASE_URL`,
  `API_CORS_ORIGINS` and `NEXT_PUBLIC_API_BASE_URL` accordingly.

---

## 9. When to graduate from this setup

Stay on this setup until **at least one** of these is true:

- You're paying more than ~$25/month on Railway.
- The 5 GB volume is consistently full.
- You need multiple workers / regions.
- You want signed-URL downloads instead of streaming through the api.

At that point, the upgrade path is already documented:

1. Move file storage to **Cloudflare R2** + signed URLs in `/jobs/{id}/download`.
2. Add **Alembic** migrations.
3. Scale the `worker` horizontally on Railway (it's stateless once R2 is in).
4. Add **Sentry** + structured logs.

You don't need any of that today.
