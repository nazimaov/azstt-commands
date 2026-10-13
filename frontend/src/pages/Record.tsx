import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, getTasks, PhraseTask, uploadRecording } from "../api/client";
import { useRecorder } from "../lib/recorder";
import { ensureParticipant, hasGivenConsent } from "../lib/participant";

const STATE_LABELS: Record<string, string> = {
  idle: "Готово к записи",
  requesting: "Запрашиваем доступ к микрофону…",
  recording: "Идёт запись…",
  recorded: "Запись готова — прослушайте перед отправкой",
  error: "Ошибка микрофона",
};

export default function Record() {
  const navigate = useNavigate();
  const recorder = useRecorder();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<PhraseTask[] | null>(null);
  const [index, setIndex] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasGivenConsent()) {
      navigate("/consent");
      return;
    }
    ensureParticipant()
      .then(setParticipantId)
      .catch(() => setLoadError("Не удалось зарегистрировать участника — проверьте соединение"));
    getTasks()
      .then((res) => setTasks(res.items))
      .catch(() => setLoadError("Не удалось загрузить список фраз — проверьте соединение"));
  }, [navigate]);

  useEffect(() => {
    if (!recorder.blob) {
      setPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(recorder.blob);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recorder.blob]);

  if (loadError) {
    return (
      <main className="page">
        <p className="error">{loadError}</p>
        <button onClick={() => window.location.reload()}>Повторить</button>
      </main>
    );
  }

  if (!tasks || participantId === null) {
    return <main className="page"><p>Загрузка…</p></main>;
  }

  if (tasks.length === 0) {
    return (
      <main className="page">
        <p>Пока нет доступных фраз для записи. Загляните позже.</p>
        <Link to="/">На главную</Link>
      </main>
    );
  }

  if (index >= tasks.length) {
    return (
      <main className="page">
        <h1>Все задания выполнены</h1>
        <p>Спасибо за участие! Можете начать заново — порядок фраз будет перемешан.</p>
        <button className="primary" onClick={() => setIndex(0)}>Начать снова</button>{" "}
        <Link to="/">На главную</Link>
      </main>
    );
  }

  const task = tasks[index];

  async function handleSave() {
    if (!recorder.blob) return;
    setSaving(true);
    setSaveError(null);
    try {
      const filename = recorder.mimeType?.includes("ogg") ? "recording.ogg" : "recording.webm";
      await uploadRecording(participantId!, task.phrase_version_id, recorder.blob, filename);
      recorder.reset();
      setIndex((i) => i + 1);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Не удалось сохранить запись — проверьте соединение и повторите");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    recorder.reset();
    setSaveError(null);
    setIndex((i) => i + 1);
  }

  return (
    <main className="page">
      <p className="progress">Задание {index + 1} из {tasks.length}</p>
      <h1>{task.command_title}</h1>
      <p className="phrase-text">{task.text}</p>

      <p className="status-indicator">{STATE_LABELS[recorder.state]}</p>
      {recorder.state === "error" && <p className="error">{recorder.error}</p>}

      <div className="record-controls">
        {recorder.state === "idle" && <button className="primary" onClick={recorder.start}>Записать</button>}
        {recorder.state === "recording" && <button className="primary" onClick={recorder.stop}>Остановить запись</button>}
        {recorder.state === "error" && <button onClick={recorder.reset}>Повторить</button>}

        {recorder.state === "recorded" && playbackUrl && (
          <>
            <audio src={playbackUrl} controls />
            <div className="record-controls">
              <button onClick={recorder.reset}>Перезаписать</button>
              <button className="primary" disabled={saving} onClick={handleSave}>
                {saving ? "Сохранение…" : "Сохранить и продолжить"}
              </button>
            </div>
          </>
        )}
      </div>

      {saveError && (
        <p className="error">
          {saveError} <button onClick={handleSave}>Повторить отправку</button>
        </p>
      )}

      <p><button className="link-button" onClick={handleSkip}>Пропустить эту фразу</button></p>
    </main>
  );
}
