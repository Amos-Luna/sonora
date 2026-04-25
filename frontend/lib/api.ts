export type JobAction = "video_download" | "audio_download";

export type VideoQuality = "360" | "480" | "720" | "1080";
export type AudioFormat = "mp3" | "wav";

export type UserRole = "owner" | "guest";

export type MediaPreview = {
  url: string;
  title: string;
  thumbnail?: string | null;
  duration_seconds?: number | null;
  channel?: string | null;
  formats: Array<{
    format_id: string;
    extension?: string | null;
    resolution?: string | null;
  }>;
};

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type Job = {
  id: string;
  action: JobAction;
  status: JobStatus;
  source_url: string;
  title?: string | null;
  progress: number;
  options: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error_message?: string | null;
};

export type SonoraUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: UserRole;
};

export type Session = {
  access_token: string;
  user: SonoraUser;
};

export type InviteCondition = "active" | "revoked" | "expired" | "exhausted";

export type Invite = {
  id: string;
  label: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  condition: InviteCondition;
  downloads_total: number;
  downloads_video: number;
  downloads_audio: number;
  downloads_completed: number;
  downloads_failed: number;
  last_activity_at: string | null;
  url?: string | null;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string) {
  return request<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getCurrentUser(token: string) {
  return request<SonoraUser>("/auth/me", {}, token);
}

export function logout(token: string) {
  return request<{ status: string }>("/auth/logout", { method: "POST" }, token);
}

export function previewMedia(url: string, token: string) {
  return request<MediaPreview>(
    "/media/preview",
    { method: "POST", body: JSON.stringify({ url }) },
    token
  );
}

export type VideoOptions = { format: "mp4"; quality: VideoQuality };
export type AudioOptions = { format: AudioFormat; bitrate?: string };
export type JobOptions = VideoOptions | AudioOptions;

export function createJob(
  sourceUrl: string,
  action: JobAction,
  options: JobOptions,
  token: string
) {
  return request<Job>(
    "/jobs",
    {
      method: "POST",
      body: JSON.stringify({ source_url: sourceUrl, action, options })
    },
    token
  );
}

export function listJobs(token: string) {
  return request<Job[]>("/jobs", {}, token);
}

export function downloadUrl(jobId: string) {
  return `${API_BASE_URL}/jobs/${jobId}/download`;
}

export type InviteCreateInput = {
  label?: string | null;
  expires_in_hours?: number | null;
  max_uses?: number | null;
};

export function createInvite(input: InviteCreateInput, token: string) {
  return request<Invite>(
    "/invites",
    { method: "POST", body: JSON.stringify(input) },
    token
  );
}

export function listInvites(token: string) {
  return request<Invite[]>("/invites", {}, token);
}

export function revokeInvite(inviteId: string, token: string) {
  return request<Invite>(`/invites/${inviteId}`, { method: "DELETE" }, token);
}

export function redeemInvite(token: string) {
  return request<Session>(`/invites/${token}/redeem`, { method: "POST" });
}
