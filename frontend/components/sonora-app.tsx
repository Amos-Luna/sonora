"use client";

import {
  Download,
  Eye,
  EyeOff,
  Headphones,
  LogOut,
  Music2,
  Sparkles,
  Video as VideoIcon
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AudioFormat,
  Job,
  JobAction,
  MediaPreview,
  Session,
  VideoQuality,
  createJob,
  downloadUrl,
  listJobs,
  login,
  previewMedia,
  signup
} from "@/lib/api";

const VIDEO_QUALITIES: VideoQuality[] = ["360", "480", "720", "1080"];
const AUDIO_FORMATS: AudioFormat[] = ["mp3", "wav"];

export function SonoraApp() {
  const [session, setSession] = useState<Session | null>(null);

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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setMessage("Enter your email and password.");
      return;
    }
    if (mode === "signup" && password.length < 10) {
      setMessage("Password must be at least 10 characters long.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const session =
        mode === "signup" ? await signup(email, password) : await login(email, password);
      onAuthenticated(session);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Authentication failed.";
      if (mode === "signup" && detail.toLowerCase().includes("already exists")) {
        setMessage(
          "This email is already registered. Switch to Login and use the same password."
        );
      } else {
        setMessage(detail);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.18),_transparent_55%),#070b16] px-6 py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 shadow-glow">
              <Music2 className="h-6 w-6 text-violet-200" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-200">Sonora</p>
              <h1 className="text-xl font-semibold text-white">Media intelligence studio</h1>
            </div>
          </div>

          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-100">
            <Sparkles className="h-4 w-4" />
            Simple. Secure. Fast.
          </p>

          <h2 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Download YouTube videos and audio in seconds.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Sonora is a clean, secure platform to convert any YouTube link into a video file
            (MP4) or an audio file (MP3 or WAV) and save it directly to your device.
          </p>

          <ul className="mt-8 grid gap-3 text-sm text-slate-300">
            <li className="flex items-center gap-3">
              <VideoIcon className="h-4 w-4 text-violet-300" /> Video in MP4 with quality up to
              1080p.
            </li>
            <li className="flex items-center gap-3">
              <Headphones className="h-4 w-4 text-violet-300" /> Audio in MP3 or lossless WAV.
            </li>
            <li className="flex items-center gap-3">
              <Download className="h-4 w-4 text-violet-300" /> One click and the file lands in
              your Downloads folder.
            </li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex rounded-2xl bg-black/30 p-1 text-sm">
            <button
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${
                mode === "login" ? "bg-white text-ink" : "text-slate-300"
              }`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${
                mode === "signup" ? "bg-white text-ink" : "text-slate-300"
              }`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Create account
            </button>
          </div>

          <form className="grid gap-3" onSubmit={handleSubmit}>
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
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
                id="password"
                placeholder={mode === "signup" ? "At least 10 characters" : "Your password"}
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
              disabled={loading}
              type="submit"
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
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
              <h1 className="text-xl font-semibold text-white">Downloads</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 md:inline">
              {session.user.email}
            </span>
            <button
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              onClick={onSignOut}
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
