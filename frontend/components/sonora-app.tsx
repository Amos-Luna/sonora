"use client";

import { Activity, Download, Music2, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  Job,
  JobAction,
  MediaPreview,
  createJob,
  listJobs,
  login,
  previewMedia,
  signup
} from "@/lib/api";

const actions: Array<{ value: JobAction; label: string; description: string }> = [
  { value: "video_download", label: "Video", description: "MP4 up to 720p for the MVP" },
  { value: "audio_download", label: "Audio", description: "Clean MP3 export through FFmpeg" },
  { value: "lyrics", label: "Lyrics", description: "Queue contract ready for Whisper" },
  { value: "stems", label: "Stems", description: "Queue contract ready for Demucs" },
  { value: "music_analysis", label: "Analysis", description: "BPM/key/chords pipeline slot" },
  { value: "metadata", label: "Metadata", description: "Enrichment workflow slot" }
];

export function SonoraApp() {
  const [email, setEmail] = useState("founder@sonora.local");
  const [password, setPassword] = useState("change-me-123");
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedAction, setSelectedAction] = useState<JobAction>("audio_download");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = Boolean(token);
  const selectedActionMeta = useMemo(
    () => actions.find((action) => action.value === selectedAction),
    [selectedAction]
  );

  async function authenticate(mode: "login" | "signup") {
    setLoading(true);
    setMessage(null);
    try {
      const session = mode === "signup" ? await signup(email, password) : await login(email, password);
      setToken(session.access_token);
      setMessage(`Signed in as ${session.user.email}`);
      setJobs(await listJobs(session.access_token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage("Create or login to an account first.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      setPreview(await previewMedia(url, token));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateJob() {
    if (!token || !url) {
      setMessage("Authenticate and paste a YouTube URL first.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await createJob(url, selectedAction, token);
      setJobs(await listJobs(token));
      setMessage("Job queued. The worker will process it in the background.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Job creation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.26),_transparent_35%),#070b16]">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3 shadow-glow">
              <Music2 className="h-6 w-6 text-violet-200" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-violet-200">Sonora</p>
              <h1 className="text-xl font-semibold text-white">Media intelligence studio</h1>
            </div>
          </div>
          <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
            {isAuthenticated ? "Secure session active" : "MVP cockpit"}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
            <div className="mb-8 max-w-2xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-100">
                <Sparkles className="h-4 w-4" />
                Download, transform and analyze media with a production-shaped architecture.
              </p>
              <h2 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Turn YouTube links into usable creative assets.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                A clean MVP with auth, preview, queue-based jobs, media downloads, health checks and
                extension points for lyrics, stems, BPM and metadata intelligence.
              </p>
            </div>

            <form className="grid gap-3 rounded-3xl bg-black/25 p-4" onSubmit={handlePreview}>
              <label className="text-sm font-medium text-slate-200" htmlFor="url">
                YouTube URL
              </label>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  id="url"
                  className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none ring-violet-400 transition focus:ring-2"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
                <button
                  className="rounded-2xl bg-white px-5 py-3 font-semibold text-ink transition hover:bg-violet-100 disabled:opacity-60"
                  disabled={loading}
                  type="submit"
                >
                  Preview
                </button>
              </div>
            </form>

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
                  <h3 className="text-xl font-semibold text-white">{preview.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {preview.channel ?? "Unknown channel"} - {preview.duration_seconds ?? "?"} seconds
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    {preview.formats.length} formats detected and ready for controlled processing.
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="grid gap-5">
            <form
              className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur"
              onSubmit={(event) => {
                event.preventDefault();
                void authenticate("login");
              }}
            >
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="text-lg font-semibold">Account</h2>
              </div>
              <div className="grid gap-3">
                <input
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-400"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                />
                <input
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-400"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button className="rounded-2xl bg-violet-500 px-4 py-3 font-semibold" disabled={loading}>
                    Login
                  </button>
                  <button
                    className="rounded-2xl border border-white/10 px-4 py-3 font-semibold"
                    disabled={loading}
                    onClick={() => void authenticate("signup")}
                    type="button"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <div className="mb-5 flex items-center gap-3">
                <Wand2 className="h-5 w-5 text-violet-200" />
                <h2 className="text-lg font-semibold">Actions</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {actions.map((action) => (
                  <button
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedAction === action.value
                        ? "border-violet-300 bg-violet-500/20"
                        : "border-white/10 bg-black/20"
                    }`}
                    key={action.value}
                    onClick={() => setSelectedAction(action.value)}
                    type="button"
                  >
                    <span className="font-semibold text-white">{action.label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{action.description}</span>
                  </button>
                ))}
              </div>
              <button
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-ink disabled:opacity-60"
                disabled={loading}
                onClick={handleCreateJob}
              >
                <Download className="h-4 w-4" />
                Queue {selectedActionMeta?.label}
              </button>
            </div>
          </aside>
        </div>

        {message ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-slate-200">
            {message}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
          <div className="mb-5 flex items-center gap-3">
            <Activity className="h-5 w-5 text-violet-200" />
            <h2 className="text-lg font-semibold">Recent jobs</h2>
          </div>
          <div className="grid gap-3">
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs yet. Preview a link and queue an action.</p>
            ) : (
              jobs.map((job) => (
                <article className="rounded-2xl border border-white/10 bg-black/20 p-4" key={job.id}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-semibold text-white">{job.title ?? job.source_url}</p>
                      <p className="text-sm text-slate-400">
                        {job.action} - {job.status} - {job.progress}%
                      </p>
                      {job.error_message ? (
                        <p className="mt-2 text-sm text-red-200">{job.error_message}</p>
                      ) : null}
                    </div>
                    {typeof job.result?.download_url === "string" ? (
                      <a
                        className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950"
                        href={job.result.download_url}
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
