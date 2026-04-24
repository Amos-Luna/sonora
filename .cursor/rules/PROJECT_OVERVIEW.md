# Project: Smart Media Download Platform — SONORA Project

## General Objective

Build a modern, elegant, and scalable web platform (startup SaaS style) where users can securely authenticate, paste a YouTube link, and download the content in the format they choose.

This MVP should focus ONLY on one core purpose:

Download media from YouTube in a simple, fast, reliable, and production-ready way.

The platform must allow users to:

* paste a YouTube link
* choose if they want Video or Audio
* if Video: choose the available quality
* if Audio: choose the available format
* download the final processed file

Nothing else.

No lyrics extraction.
No BPM detection.
No stem separation.
No music analysis.
No advanced features.

The goal is a clean MVP with excellent UX, strong backend architecture, and real startup-quality execution.

---

# Deployment Strategy (Recommended Approach)

Because this project uses FFmpeg and yt-dlp for media processing, pure serverless is not the best option.

The best MVP architecture is:

## Frontend

Deploy frontend serverlessly.

Recommended:

* Vercel

Why:

* best for Next.js
* fastest deployment
* automatic previews
* easy domain setup
* excellent developer experience
* ideal for startup MVPs

---

## Backend

Deploy FastAPI as a Dockerized service.

Recommended:

* Railway (best MVP choice)
* Render
* Fly.io

Why:

* FFmpeg requires stable compute
* yt-dlp jobs are better in containers
* long-running downloads are not ideal for Lambda
* easier production reliability
* lower operational complexity

Recommended approach:

* FastAPI inside Docker
* deployed on Railway

This is significantly better than trying full serverless for this use case.

---

## Storage

Recommended:

* Cloudflare R2

Alternative:

* AWS S3

Used for:

* temporary generated files
* download delivery
* file expiration strategy

---

## Database

Recommended:

* PostgreSQL

Used for:

* users
* authentication metadata
* download history
* job tracking

---

## Repository Structure

## Recommended: Monorepo

Use one single repository.

Why:

* faster development
* easier deployment
* simpler CI/CD
* easier environment management
* better for startup MVP speed

Recommended structure:

```text
sonora/
├── frontend/        # Next.js
├── backend/         # FastAPI
├── infra/           # Docker configs
├── scripts/
├── docs/
└── docker-compose.yml
```

Do not split repositories early.

Monorepo is the correct decision for this MVP.

---

# Expected Stack

## Backend

* Python
* FastAPI
* FFmpeg
* yt-dlp
* Docker
* PostgreSQL
* Cloudflare R2 or AWS S3
* Production-ready API
* Secure authentication
* Clean and documented endpoints

Deployment:

* Dockerized FastAPI
* Hosted on Railway

---

## Frontend

* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui
* Modern startup-style dashboard
* Premium and simple UX
* Fully responsive

Deployment:

* Vercel

---

# Main User Flow

## 1. Authentication

Users should be able to:

* Sign up with Gmail OAuth
* Secure login
* Email verification
* Private dashboard
* Secure session handling

Optional future:

* free plan + credits
* subscription model

---

## 2. Link Input

The user pastes a YouTube link.

Supported:

* YouTube videos
* YouTube Shorts

Future:

* playlists
* SoundCloud
* TikTok

The system should:

* validate the link
* show preview
* title
* thumbnail
* duration
* channel
* available video qualities
* available audio formats

---

## 3. Core Features

## A. Video Download

The user selects:

### Video Quality

* 360p
* 480p
* 720p
* 1080p
* 2K (if available)
* 4K (if available)

### Video Format

* mp4
* mkv
* mov

Then downloads the final file.

Nothing more.

---

## B. Audio Download

The user selects:

### Audio Format

* mp3
* wav
* flac
* aac
* m4a

Then downloads the final file.

Nothing more.

---

# User Dashboard

Must include:

* download history
* generated files
* temporary download links
* re-download option
* jobs in progress
* real-time progress status

Simple, clean, and useful.

---

# Important Security

Implement:

* secure OAuth
* JWT or robust session system
* rate limiting
* anti-spam
* anti-abuse
* signed URLs
* file expiration
* strong input validation
* logs
* monitoring
* cost protection

Do not build an insecure MVP.

---

# Expected UX/UI

It must look like:

* serious startup
* premium product
* clean
* minimal
* elegant
* modern
* fast
* intuitive

Avoid university-project appearance.

It must feel like a real product.

---

# What the Agent Must Deliver

## Phase 1

Design:

* complete architecture
* justified technical decisions
* backend structure
* frontend structure
* storage strategy
* security
* estimated costs
* realistic roadmap

## Phase 2

Build:

* production-ready backend
* production-ready frontend
* complete authentication
* yt-dlp + FFmpeg download pipeline
* video download system
* audio download system
* dashboard
* deployment strategy

## Phase 3

Optimize:

* performance
* costs
* observability
* scalability
* analytics
* future monetization

---

# Important Rule

I do not want a mediocre solution.

I want this designed as a serious product that could become a real startup.

Every technical decision must be justified as if we were building a real company, not just a side project.

Prioritize:

* intelligent simplicity
* low cost
* future scalability
* excellent UX
* clean architecture
* execution speed

The goal is not just to make something that works, but to build something clean, reliable, and ready for real users.
