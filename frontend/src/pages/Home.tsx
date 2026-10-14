import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStats, listRecordings, RecordingOut, Stats } from "../api/client";
import { useLang } from "../lib/i18n";
import { getStoredParticipantId, hasGivenConsent } from "../lib/participant";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recordings, setRecordings] = useState<RecordingOut[]>([]);

  useEffect(() => {
    getStats().then(setStats).catch(() => setStats(null));
    const participantId = getStoredParticipantId();
    if (participantId) {
      listRecordings(participantId).then(setRecordings).catch(() => setRecordings([]));
    }
  }, []);

  function handleStart() {
    navigate(hasGivenConsent() ? "/record" : "/consent");
  }

  return (
    <main className="page">
      <section className="hero">
        <h1>AzSTT Commands</h1>
        <p>{t("home.lead")}</p>
        <button className="primary large" onClick={handleStart}>{t("home.start")}</button>
      </section>

      {stats && (
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-value">{stats.commands_count}</span>
            <span className="stat-label">{t("home.statCommands")}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{stats.recordings_count}</span>
            <span className="stat-label">{t("home.statRecordings")}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{stats.pending_count}</span>
            <span className="stat-label">{t("home.statPending")}</span>
          </div>
        </div>
      )}

      <p>
        <Link to="/consent">{t("home.rulesLink")}</Link>
      </p>

      {recordings.length > 0 && (
        <section>
          <h2>{t("home.myRecordings")}</h2>
          <ul className="recordings-list">
            {recordings.map((r) => (
              <li key={r.id} className="recording-row">
                <span>{new Date(r.created_at).toLocaleString("ru-RU")}</span>
                <span className={`status-badge status-badge-${r.status}`}>
                  <span className="status-dot" />
                  {t(`status.${r.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
