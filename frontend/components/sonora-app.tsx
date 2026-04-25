"use client";

import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  LogOut,
  Music2,
  ShieldCheck,
  Trash2,
  Video as VideoIcon
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioFormat,
  Invite,
  Job,
  JobAction,
  MediaPreview,
  Session,
  VideoQuality,
  createInvite,
  createJob,
  downloadUrl,
  listInvites,
  listJobs,
  login,
  logout,
  previewMedia,
  revokeInvite
} from "@/lib/api";
import { useSession } from "@/lib/session";

const VIDEO_QUALITIES: VideoQuality[] = ["360", "480", "720", "1080"];
const AUDIO_FORMATS: AudioFormat[] = ["mp3", "wav"];

export function SonoraApp() {
  const { session, loading, setSession } = useSession();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070b16] text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </main>
    );
  }

  if (!session) {
    return <Landing onAuthenticated={setSession} />;
  }
  return <Dashboard session={session} onSignOut={() => setSession(null)} />;
}

function Landing({
  onAuthenticated
}: {
  onAuthenticated: (session: Session) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setMessage("Enter your email and password.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const session = await login(email, password);
      onAuthenticated(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.18),_transparent_55%),#070b16] px-6 py-12">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 shadow-glow">
              <Music2 className="h-6 w-6 text-violet-200" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-200">Sonora</p>
              <h1 className="text-xl font-semibold text-white">Private media studio</h1>
            </div>
          </div>

          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-100">
            <ShieldCheck className="h-4 w-4" />
            Invite-only access
          </p>

          <h2 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Download YouTube videos and audio. Fast and private.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Sonora is a single-owner app: only the owner signs in with a password. Guests
            enter through personal invite links generated from the dashboard. No public
            signup, no shared credentials.
          </p>

          <ul className="mt-8 grid gap-3 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <VideoIcon className="h-4 w-4 text-violet-300" /> Video in MP4 up to 1080p.
            </li>
            <li className="flex items-center gap-3">
              <Headphones className="h-4 w-4 text-violet-300" /> Audio in MP3 or lossless
              WAV.
            </li>
            <li className="flex items-center gap-3">
              <Download className="h-4 w-4 text-violet-300" /> Files go straight to your
              Downloads folder.
            </li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
          <h3 className="text-lg font-semibold text-white">Owner sign in</h3>
          <p className="mt-1 text-sm text-slate-400">
            If you received an invite link, open it directly — you don&apos;t need a
            password.
          </p>

          <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
            <label className="text-sm text-slate-300" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-400"
              id="email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label className="text-sm text-slate-300" htmlFor="password">
              Password
            </label>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/10 pr-2 focus-within:ring-2 focus-within:ring-violet-400">
              <input
                autoComplete="current-password"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
                id="password"
                placeholder="Your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              className="mt-2 rounded-2xl bg-violet-500 px-4 py-3 text-base font-semibold transition hover:bg-violet-400 disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? "Please wait..." : "Login"}
            </button>
            {message ? (
              <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {message}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </main>
  );
}

function Dashboard({
  session,
  onSignOut
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [action, setAction] = useState<JobAction>("video_download");
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("720");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [message, setMessage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [queuing, setQueuing] = useState(false);

  const token = session.access_token;
  const isOwner = session.user.role === "owner";

  const refreshJobs = useCallback(async () => {
    try {
      setJobs(await listJobs(token));
    } catch {
      // ignore polling errors silently
    }
  }, [token]);

  useEffect(() => {
    void refreshJobs();
    const interval = setInterval(refreshJobs, 4000);
    return () => clearInterval(interval);
  }, [refreshJobs]);

  const hasPendingJob = useMemo(
    () => jobs.some((job) => job.status === "queued" || job.status === "running"),
    [jobs]
  );

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url) {
      setMessage("Paste a YouTube URL first.");
      return;
    }
    setLoadingPreview(true);
    setMessage(null);
    try {
      setPreview(await previewMedia(url, token));
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : "Could not load preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleQueue() {
    if (!url) {
      setMessage("Paste a YouTube URL first.");
      return;
    }
    setQueuing(true);
    setMessage(null);
    try {
      if (action === "video_download") {
        await createJob(url, "video_download", { format: "mp4", quality: videoQuality }, token);
      } else {
        await createJob(url, "audio_download", { format: audioFormat }, token);
      }
      await refreshJobs();
      setMessage("Download queued. It will be ready in a moment.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start download.");
    } finally {
      setQueuing(false);
    }
  }

  async function handleSignOut() {
    try {
      await logout(token);
    } catch {
      // ignore; we clear the client session regardless
    }
    onSignOut();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.22),_transparent_45%),#070b16] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 shadow-glow">
              <Music2 className="h-6 w-6 text-violet-200" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-200">Sonora</p>
              <h1 className="text-xl font-semibold text-white">
                {isOwner ? "Dashboard" : "Guest access"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 md:inline">
              {isOwner ? session.user.email : session.user.full_name ?? "Guest"}
            </span>
            <button
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              onClick={handleSignOut}
              type="button"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
            onSubmit={handlePreview}
          >
            <label className="text-sm font-medium text-slate-200" htmlFor="url">
              YouTube URL
            </label>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
              <input
                className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none focus:ring-2 focus:ring-violet-400"
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <button
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-ink transition hover:bg-violet-100 disabled:opacity-60"
                disabled={loadingPreview}
                type="submit"
              >
                {loadingPreview ? "Loading..." : "Preview"}
              </button>
            </div>

            {preview ? (
              <div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-[160px_1fr]">
                {preview.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={preview.title}
                    className="h-28 w-full rounded-2xl object-cover"
                    src={preview.thumbnail}
                  />
                ) : (
                  <div className="h-28 rounded-2xl bg-white/10" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">{preview.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {preview.channel ?? "Unknown channel"}
                    {preview.duration_seconds
                      ? ` - ${formatDuration(preview.duration_seconds)}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-black/20 px-4 py-3 text-sm text-slate-300">
                Paste a YouTube link and press Preview to see the title and thumbnail before
                downloading.
              </p>
            )}
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">What do you want?</h2>
            <p className="mt-1 text-sm text-slate-400">Choose one and start the download.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className={`rounded-2xl border p-4 text-left transition ${
                  action === "video_download"
                    ? "border-violet-300 bg-violet-500/20"
                    : "border-white/10 bg-black/20"
                }`}
                onClick={() => setAction("video_download")}
                type="button"
              >
                <span className="flex items-center gap-2 font-semibold text-white">
                  <VideoIcon className="h-4 w-4" /> Video (MP4)
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  Choose a resolution up to 1080p.
                </span>
              </button>
              <button
                className={`rounded-2xl border p-4 text-left transition ${
                  action === "audio_download"
                    ? "border-violet-300 bg-violet-500/20"
                    : "border-white/10 bg-black/20"
                }`}
                onClick={() => setAction("audio_download")}
                type="button"
              >
                <span className="flex items-center gap-2 font-semibold text-white">
                  <Headphones className="h-4 w-4" /> Audio
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  Pick MP3 or lossless WAV.
                </span>
              </button>
            </div>

            <div className="mt-5">
              {action === "video_download" ? (
                <div>
                  <p className="text-sm text-slate-300">Resolution</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {VIDEO_QUALITIES.map((quality) => (
                      <button
                        className={`rounded-xl border px-3 py-2 text-sm transition ${
                          videoQuality === quality
                            ? "border-violet-300 bg-violet-500/20 text-white"
                            : "border-white/10 bg-black/20 text-slate-300"
                        }`}
                        key={quality}
                        onClick={() => setVideoQuality(quality)}
                        type="button"
                      >
                        {quality}p
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-300">Audio format</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {AUDIO_FORMATS.map((format) => (
                      <button
                        className={`rounded-xl border px-3 py-2 text-sm uppercase transition ${
                          audioFormat === format
                            ? "border-violet-300 bg-violet-500/20 text-white"
                            : "border-white/10 bg-black/20 text-slate-300"
                        }`}
                        key={format}
                        onClick={() => setAudioFormat(format)}
                        type="button"
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-ink transition hover:bg-violet-100 disabled:opacity-60"
              disabled={queuing || !url}
              onClick={handleQueue}
              type="button"
            >
              <Download className="h-4 w-4" />
              {queuing
                ? "Starting..."
                : action === "video_download"
                ? `Download Video ${videoQuality}p`
                : `Download Audio ${audioFormat.toUpperCase()}`}
            </button>
          </aside>
        </section>

        {message ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm text-slate-200">
            {message}
          </div>
        ) : null}

        {isOwner ? <InvitesPanel token={token} /> : null}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent downloads</h2>
            {hasPendingJob ? (
              <span className="text-xs text-violet-200">Processing...</span>
            ) : null}
          </div>

          {jobs.length === 0 ? (
            <p className="text-sm text-slate-400">
              Your finished downloads will appear here once they are ready.
            </p>
          ) : (
            <ul className="grid gap-3">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

type ExpiresMode = "days" | "hours";

const EXPIRES_MAX_DAYS = 7;
const EXPIRES_MAX_HOURS = EXPIRES_MAX_DAYS * 24;

function clampInt(raw: string, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

interface ExpiresOptionProps {
  unit: string;
  value: string;
  max: number;
  active: boolean;
  onActivate: () => void;
  onChange: (value: string) => void;
}

function ExpiresOption({
  unit,
  value,
  max,
  active,
  onActivate,
  onChange
}: ExpiresOptionProps) {
  const containerClass = active
    ? "border-violet-400/60 bg-violet-500/10"
    : "border-white/10 bg-white/10 opacity-60 hover:opacity-90 cursor-pointer";
  const dotClass = active
    ? "border-violet-300 bg-violet-400/20"
    : "border-slate-500 bg-transparent";
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${containerClass}`}
      onClick={() => {
        if (!active) onActivate();
      }}
      role={active ? undefined : "button"}
      tabIndex={active ? -1 : 0}
      onKeyDown={(event) => {
        if (!active && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${dotClass}`}>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-violet-300" /> : null}
      </span>
      <input
        className="w-12 bg-transparent text-sm font-semibold text-white outline-none disabled:cursor-pointer disabled:text-slate-500"
        type="number"
        min={1}
        max={max}
        value={value}
        onFocus={onActivate}
        onChange={(event) => onChange(event.target.value)}
        disabled={!active}
      />
      <span className="ml-auto text-xs uppercase tracking-[0.14em] text-slate-300">
        {unit}
      </span>
    </div>
  );
}

function InvitesPanel({ token }: { token: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [label, setLabel] = useState("");
  const [expiresMode, setExpiresMode] = useState<ExpiresMode>("hours");
  const [days, setDays] = useState("1");
  const [hours, setHours] = useState("24");
  const [maxUses, setMaxUses] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      setInvites(await listInvites(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invites.");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ttlHours =
        expiresMode === "days"
          ? clampInt(days, 1, EXPIRES_MAX_DAYS, 1) * 24
          : clampInt(hours, 1, EXPIRES_MAX_HOURS, 24);
      const invite = await createInvite(
        {
          label: label.trim() || null,
          expires_in_hours: ttlHours,
          max_uses: clampInt(maxUses, 1, 100, 1)
        },
        token
      );
      setLastCreated(invite);
      setCopied(false);
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      await revokeInvite(inviteId, token);
      if (lastCreated?.id === inviteId) setLastCreated(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke invite.");
    }
  }

  async function handleCopy() {
    if (!lastCreated?.url) return;
    try {
      await navigator.clipboard.writeText(lastCreated.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Invites</h2>
        <p className="text-sm text-slate-400">
          Generate a short-lived link for someone you trust. You can revoke it any time
          and see what they&apos;ve downloaded.
        </p>
      </div>

      <form
        className="mt-5 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-[1.1fr_1.6fr_0.7fr_auto] md:items-end"
        onSubmit={handleCreate}
      >
        <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-slate-400">
          Label
          <input
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="e.g. Papá, Mamá, Edson..."
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-400">
            Expires in <span className="ml-1 text-[10px] tracking-[0.12em] text-slate-500">(max {EXPIRES_MAX_DAYS} days)</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <ExpiresOption
              unit="Days"
              value={days}
              max={EXPIRES_MAX_DAYS}
              active={expiresMode === "days"}
              onActivate={() => setExpiresMode("days")}
              onChange={setDays}
            />
            <ExpiresOption
              unit="Hours"
              value={hours}
              max={EXPIRES_MAX_HOURS}
              active={expiresMode === "hours"}
              onActivate={() => setExpiresMode("hours")}
              onChange={setHours}
            />
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-slate-400">
          Max link uses
          <input
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-violet-400"
            min={1}
            max={100}
            type="number"
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
          />
        </label>

        <button
          className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? "Creating..." : "Create invite"}
        </button>
      </form>

      {lastCreated?.url ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-200">
            Share this link — it is shown only once.
          </p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <code className="flex-1 truncate rounded-xl bg-black/30 px-3 py-2 text-xs text-emerald-100">
              {lastCreated.url}
            </code>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 px-3 py-2 text-xs text-emerald-100 transition hover:bg-emerald-500/20"
              onClick={handleCopy}
              type="button"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time left</th>
              <th className="px-4 py-3 text-right">Downloads</th>
              <th className="px-4 py-3 text-right">Video</th>
              <th className="px-4 py-3 text-right">Audio</th>
              <th className="px-4 py-3">Last activity</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {invites.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={10}>
                  No invites yet. Create one above to share access.
                </td>
              </tr>
            ) : (
              invites.map((invite) => {
                const expiresAt = new Date(invite.expires_at).getTime();
                const expires = new Date(invite.expires_at);
                const last = invite.last_activity_at
                  ? new Date(invite.last_activity_at)
                  : null;
                const status = computeStatus(invite, now);
                const canRevoke = expiresAt > now && invite.revoked_at === null;
                return (
                  <tr className="align-top hover:bg-white/[0.03]" key={invite.id}>
                    <td className="px-4 py-3 font-semibold text-white">
                      {invite.label ?? (
                        <span className="italic text-slate-400">unlabeled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {invite.used_count}
                      <span className="text-slate-500">/{invite.max_uses}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{expires.toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">
                        {expires.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-200">
                      {status === "active" ? (
                        formatCountdown(expiresAt - now)
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {invite.downloads_total}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-slate-200">
                        <VideoIcon className="h-3.5 w-3.5 text-violet-300" />
                        {invite.downloads_video}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-slate-200">
                        <Headphones className="h-3.5 w-3.5 text-violet-300" />
                        {invite.downloads_audio}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {last ? (
                        <>
                          <div>{last.toLocaleDateString()}</div>
                          <div className="text-slate-500">
                            {last.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRevoke ? (
                        <button
                          aria-label="Revoke invite"
                          className="inline-flex items-center justify-center rounded-full border border-red-300/40 p-2 text-red-200 transition hover:bg-red-500/10"
                          onClick={() => handleRevoke(invite.id)}
                          title="Revoke invite"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type DisplayStatus = "active" | "inactive" | "revoked";

function computeStatus(invite: Invite, now: number): DisplayStatus {
  if (invite.revoked_at) return "revoked";
  if (new Date(invite.expires_at).getTime() <= now) return "inactive";
  return "active";
}

function StatusBadge({ status }: { status: DisplayStatus }) {
  const style: Record<DisplayStatus, string> = {
    active: "border-emerald-300/40 bg-emerald-500/10 text-emerald-300",
    inactive: "border-slate-400/30 bg-slate-400/10 text-slate-300",
    revoked: "border-red-300/40 bg-red-500/10 text-red-300"
  };
  const dot: Record<DisplayStatus, string> = {
    active: "bg-emerald-400",
    inactive: "bg-slate-400",
    revoked: "bg-red-400"
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0d : 0h : 0m : 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d : ${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(seconds).padStart(2, "0")}s`;
}

function JobRow({ job }: { job: Job }) {
  const isReady = job.status === "completed";
  const subtitle = describeJob(job);

  return (
    <li className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{job.title ?? job.source_url}</p>
        <p className="truncate text-sm text-slate-400">{subtitle}</p>
        {job.error_message ? (
          <p className="mt-1 text-sm text-red-200">{job.error_message}</p>
        ) : null}
      </div>
      {isReady ? (
        <a
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
          download
          href={downloadUrl(job.id)}
        >
          <Download className="h-4 w-4" /> Save file
        </a>
      ) : (
        <span className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300">
          {job.status}
        </span>
      )}
    </li>
  );
}

function describeJob(job: Job): string {
  const action = job.action === "video_download" ? "Video" : "Audio";
  if (job.action === "video_download") {
    const quality = String(job.options?.quality ?? "720");
    return `${action} - MP4 ${quality}p - ${job.status}`;
  }
  const format = String(job.options?.format ?? "mp3").toUpperCase();
  return `${action} - ${format} - ${job.status}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")} min`;
}
