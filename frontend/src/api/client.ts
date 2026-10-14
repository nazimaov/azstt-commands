// Typed client for the AzSTT Commands backend API (../../backend/app/routers/*.py).
//
// API_BASE lets the frontend be built against a backend on a different origin — e.g.
// the frontend deployed to GitHub Pages (static only) calling a backend on Render/Fly.io.
// Empty by default, which keeps same-origin requests working exactly as before for local
// dev and for the single-process deployment where the backend serves the built frontend
// itself (app/main.py's StaticFiles mount) — see azstt-commands/README.md.
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export interface PhraseTask {
  phrase_version_id: string;
  command_code: string;
  command_title: string;
  text: string;
}

export interface RecordingOut {
  id: string;
  phrase_version_id: string;
  status: "pending" | "approved" | "rejected" | "needs_review";
  duration_sec: number;
  qc_result: Record<string, unknown>;
  created_at: string;
}

export interface Stats {
  commands_count: number;
  recordings_count: number;
  pending_count: number;
  participants_count: number;
}

export interface ConsentIn {
  collection: boolean;
  training_use: boolean;
  public_distribution: boolean;
  terms_version?: string;
}

export interface PhraseVersion {
  id: string;
  text: string;
  version_number: number;
  is_current: boolean;
  created_at: string;
}

export interface Phrase {
  id: string;
  enabled: boolean;
  current_text: string | null;
  recordings_count: number;
  versions: PhraseVersion[];
}

export interface Command {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: "active" | "disabled" | "archived";
  phrases: Phrase[];
}

export interface AdminRecording {
  id: string;
  participant_id: string;
  command_code: string;
  text: string;
  status: RecordingOut["status"];
  duration_sec: number;
  qc_result: Record<string, unknown>;
  rejection_reason: string | null;
  created_at: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ответ без JSON-тела — оставляем res.statusText
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { ApiError };

export function createParticipant() {
  return request<{ id: string; created_at: string }>("/api/participants", { method: "POST" });
}

export function giveConsent(participantId: string, body: ConsentIn) {
  return request<ConsentIn & { given_at: string }>(`/api/participants/${participantId}/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getStats() {
  return request<Stats>("/api/stats");
}

export function getTasks() {
  return request<{ items: PhraseTask[] }>("/api/tasks");
}

export function listRecordings(participantId: string) {
  return request<RecordingOut[]>(`/api/recordings?participant_id=${encodeURIComponent(participantId)}`);
}

export async function uploadRecording(
  participantId: string,
  phraseVersionId: string,
  blob: Blob,
  filename: string
): Promise<RecordingOut> {
  const form = new FormData();
  form.append("audio", blob, filename);
  const params = new URLSearchParams({ participant_id: participantId, phrase_version_id: phraseVersionId });
  return request<RecordingOut>(`/api/recordings?${params.toString()}`, { method: "POST", body: form });
}

// --- Admin -------------------------------------------------------------

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function adminListCommands(token: string) {
  return request<Command[]>("/api/admin/commands", { headers: authHeaders(token) });
}

export function adminCreateCommand(token: string, body: { code: string; title: string; description?: string; phrases: string[] }) {
  return request<Command>("/api/admin/commands", {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function adminUpdateCommand(token: string, commandId: string, body: { title?: string; description?: string; status?: string }) {
  return request<Command>(`/api/admin/commands/${commandId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function adminAddPhrase(token: string, commandId: string, text: string) {
  return request<Phrase>(`/api/admin/commands/${commandId}/phrases`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export function adminUpdatePhrase(token: string, phraseId: string, body: { text?: string; enabled?: boolean }) {
  return request<Phrase>(`/api/admin/phrases/${phraseId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function adminListRecordings(token: string, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<AdminRecording[]>(`/api/admin/recordings${qs}`, { headers: authHeaders(token) });
}

export function adminModerateRecording(token: string, recordingId: string, status: string, rejectionReason?: string) {
  return request<{ ok: boolean; status: string }>(`/api/admin/recordings/${recordingId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ status, rejection_reason: rejectionReason ?? null }),
  });
}

export function adminDeleteRecording(token: string, recordingId: string) {
  return request<{ ok: boolean }>(`/api/admin/recordings/${recordingId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function adminRecordingAudioUrl(recordingId: string) {
  return `${API_BASE}/api/admin/recordings/${recordingId}/audio`;
}

export async function adminDownloadExport(token: string, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/export?status=${encodeURIComponent(status)}`, { headers: authHeaders(token) });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `azstt_dataset_${status}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
