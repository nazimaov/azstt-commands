import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminRecording, adminDeleteRecording, adminDownloadExport, adminListRecordings, adminModerateRecording, adminRecordingAudioUrl } from "../../api/client";
import { useLang } from "../../lib/i18n";
import { clearAdminToken, getAdminToken } from "../../lib/adminAuth";

const STATUS_FILTERS = ["pending", "needs_review", "approved", "rejected"] as const;

export default function Moderation() {
  const navigate = useNavigate();
  const { t } = useLang();
  const token = getAdminToken();

  const [status, setStatus] = useState<string>("pending");
  const [recordings, setRecordings] = useState<AdminRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  async function reload() {
    if (!token) return;
    try {
      setRecordings(await adminListRecordings(token, status));
    } catch {
      setError(t("moderation.loadError"));
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  if (!token) return null;
  const adminToken: string = token; // narrows string|null -> string for the closures below

  async function handleLoadAudio(recordingId: string) {
    if (audioUrls[recordingId]) return;
    const res = await fetch(adminRecordingAudioUrl(recordingId), { headers: { Authorization: `Bearer ${adminToken}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    setAudioUrls((s) => ({ ...s, [recordingId]: URL.createObjectURL(blob) }));
  }

  async function handleModerate(recordingId: string, newStatus: string) {
    let reason: string | undefined;
    if (newStatus === "rejected") {
      reason = window.prompt(t("moderation.rejectPrompt")) ?? undefined;
    }
    await adminModerateRecording(adminToken, recordingId, newStatus, reason);
    reload();
  }

  async function handleDelete(recordingId: string) {
    if (!window.confirm(t("moderation.deleteConfirm"))) return;
    try {
      await adminDeleteRecording(adminToken, recordingId);
      reload();
    } catch {
      setError(t("moderation.deleteError"));
    }
  }

  async function handleExport(exportStatus: string) {
    try {
      await adminDownloadExport(adminToken, exportStatus);
    } catch {
      setError(t("moderation.exportError"));
    }
  }

  return (
    <main className="page">
      <nav className="admin-nav">
        <Link to="/admin/commands">{t("nav.commands")}</Link>
        <Link to="/admin/moderation">{t("nav.moderation")}</Link>
        <button className="link-button" onClick={() => { clearAdminToken(); navigate("/admin/login"); }}>
          {t("nav.logout")}
        </button>
      </nav>

      <h1>{t("moderation.title")}</h1>
      {error && <p className="error">{error}</p>}

      <section className="admin-card">
        <h2>{t("moderation.exportTitle")}</h2>
        <div className="export-buttons">
          {["approved", "pending", "rejected", "needs_review"].map((s) => (
            <button key={s} onClick={() => handleExport(s)}>{t("moderation.exportBtn", { status: t(`status.${s}`) })}</button>
          ))}
        </div>
      </section>

      <label>
        {t("admin.status")}{" "}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
      </label>

      <ul className="recordings-list">
        {recordings.map((r) => (
          <li key={r.id} className="admin-card">
            <div className="recording-head">
              <strong>«{r.text}»</strong>
              <span className="command-tag">{r.command_code}</span>
            </div>
            <div className="recording-meta">
              {t("moderation.participant")} {r.participant_id.slice(0, 8)}… · {r.duration_sec.toFixed(2)} с · {new Date(r.created_at).toLocaleString("ru-RU")}
            </div>
            {r.rejection_reason && (
              <div className="error">{t("moderation.rejectionReason", { reason: r.rejection_reason })}</div>
            )}
            {audioUrls[r.id] ? <audio src={audioUrls[r.id]} controls /> : <button onClick={() => handleLoadAudio(r.id)}>{t("moderation.loadAudio")}</button>}
            <div className="moderation-actions">
              <button className="success" onClick={() => handleModerate(r.id, "approved")}>{t("moderation.approve")}</button>
              <button className="danger" onClick={() => handleModerate(r.id, "rejected")}>{t("moderation.reject")}</button>
              <button onClick={() => handleModerate(r.id, "needs_review")}>{t("moderation.needsReview")}</button>
              <button className="danger" onClick={() => handleDelete(r.id)}>{t("moderation.delete")}</button>
            </div>
          </li>
        ))}
        {recordings.length === 0 && (
          <p className="empty-note">{t("moderation.noRecordings", { status: t(`status.${status}`) })}</p>
        )}
      </ul>
    </main>
  );
}
