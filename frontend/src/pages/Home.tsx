import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStats, listRecordings, RecordingOut, Stats } from "../api/client";
import { getStoredParticipantId, hasGivenConsent } from "../lib/participant";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает проверки",
  approved: "Принята",
  rejected: "Отклонена",
  needs_review: "Требует проверки",
};

export default function Home() {
  const navigate = useNavigate();
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
      <h1>AzSTT Commands</h1>
      <p>
        Сбор голосовых записей азербайджанских команд управления музыкой — для обучения
        компактной офлайн-модели распознавания. Спасибо, что помогаете собрать данные!
      </p>

      {stats && (
        <ul className="stats">
          <li><strong>{stats.commands_count}</strong> доступных команд</li>
          <li><strong>{stats.recordings_count}</strong> сохранённых записей</li>
          <li><strong>{stats.pending_count}</strong> ожидают проверки</li>
        </ul>
      )}

      <button className="primary" onClick={handleStart}>Начать запись</button>

      <p>
        <Link to="/consent">Правила участия и согласие на обработку голосовых данных</Link>
      </p>

      {recordings.length > 0 && (
        <section>
          <h2>Мои записи</h2>
          <ul className="recordings-list">
            {recordings.map((r) => (
              <li key={r.id}>
                {new Date(r.created_at).toLocaleString("ru-RU")} — {STATUS_LABELS[r.status] ?? r.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
