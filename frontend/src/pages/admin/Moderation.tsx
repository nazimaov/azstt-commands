import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminRecording, adminDownloadExport, adminListRecordings, adminModerateRecording, adminRecordingAudioUrl } from "../../api/client";
import { clearAdminToken, getAdminToken } from "../../lib/adminAuth";

const STATUS_FILTERS = ["pending", "needs_review", "approved", "rejected"] as const;

export default function Moderation() {
  const navigate = useNavigate();
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
      setError("Не удалось загрузить записи");
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
      reason = window.prompt("Причина отклонения:") ?? undefined;
    }
    await adminModerateRecording(adminToken, recordingId, newStatus, reason);
    reload();
  }

  async function handleExport(exportStatus: string) {
    try {
      await adminDownloadExport(adminToken, exportStatus);
    } catch {
      setError("Не удалось экспортировать датасет");
    }
  }

  return (
    <main className="page">
      <nav className="admin-nav">
        <Link to="/admin/commands">Команды</Link>
        <Link to="/admin/moderation">Модерация и экспорт</Link>
        <button className="link-button" onClick={() => { clearAdminToken(); navigate("/admin/login"); }}>
          Выйти
        </button>
      </nav>

      <h1>Модерация записей</h1>
      {error && <p className="error">{error}</p>}

      <section className="admin-card">
        <h2>Экспорт датасета</h2>
        {["approved", "pending", "rejected", "needs_review"].map((s) => (
          <button key={s} onClick={() => handleExport(s)}>Экспорт: {s}</button>
        ))}
      </section>

      <label>
        Статус:{" "}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <ul className="recordings-list">
        {recordings.map((r) => (
          <li key={r.id} className="admin-card">
            <div><strong>{r.command_code}</strong> — «{r.text}»</div>
            <div>участник {r.participant_id.slice(0, 8)}…, {r.duration_sec.toFixed(2)} с, {new Date(r.created_at).toLocaleString("ru-RU")}</div>
            {r.rejection_reason && <div>Причина отклонения: {r.rejection_reason}</div>}
            {audioUrls[r.id] ? <audio src={audioUrls[r.id]} controls /> : <button onClick={() => handleLoadAudio(r.id)}>Загрузить и прослушать</button>}
            <div>
              <button onClick={() => handleModerate(r.id, "approved")}>Принять</button>
              <button onClick={() => handleModerate(r.id, "rejected")}>Отклонить</button>
              <button onClick={() => handleModerate(r.id, "needs_review")}>На доп. проверку</button>
            </div>
          </li>
        ))}
        {recordings.length === 0 && <p>Нет записей со статусом «{status}»</p>}
      </ul>
    </main>
  );
}
