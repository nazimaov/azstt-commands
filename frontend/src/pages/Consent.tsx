import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { giveConsent } from "../api/client";
import { ensureParticipant, markConsentGiven } from "../lib/participant";

const TERMS_VERSION = "v1";

export default function Consent() {
  const navigate = useNavigate();
  const [collection, setCollection] = useState(false);
  const [trainingUse, setTrainingUse] = useState(true);
  const [publicDistribution, setPublicDistribution] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const participantId = await ensureParticipant();
      await giveConsent(participantId, {
        collection,
        training_use: trainingUse,
        public_distribution: publicDistribution,
        terms_version: TERMS_VERSION,
      });
      markConsentGiven();
      navigate("/record");
    } catch {
      setError("Не удалось сохранить согласие — проверьте соединение и попробуйте снова");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>Правила участия</h1>
      <p>
        Мы записываем короткие голосовые фразы для создания набора данных, по которому в
        будущем будет обучена офлайн-модель распознавания азербайджанских голосовых команд
        управления музыкой. Запись не содержит вашего имени — участник идентифицируется
        случайным кодом, без каких-либо личных данных.
      </p>
      <p>
        Вы можете в любой момент прекратить участие. Запросить удаление уже сохранённых
        записей можно, обратившись к организатору проекта.
      </p>

      <label className="checkbox-row">
        <input type="checkbox" checked={collection} onChange={(e) => setCollection(e.target.checked)} />
        Я согласен(на) на запись и сбор моего голоса для этого проекта (обязательно)
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={trainingUse} onChange={(e) => setTrainingUse(e.target.checked)} />
        Разрешаю использовать мои записи для обучения модели распознавания речи
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={publicDistribution}
          onChange={(e) => setPublicDistribution(e.target.checked)}
        />
        Разрешаю публичное распространение набора данных, включающего мои записи
      </label>

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={!collection || busy} onClick={handleSubmit}>
        Принять и продолжить
      </button>
    </main>
  );
}
