import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, getTasks, PhraseTask, uploadRecording } from "../api/client";
import { localizedCommandTitle, useLang } from "../lib/i18n";
import { useRecorder } from "../lib/recorder";
import { ensureParticipant, hasGivenConsent } from "../lib/participant";

export default function Record() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
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
      .catch(() => setLoadError(t("record.loadErrorParticipant")));
    getTasks()
      .then((res) => setTasks(res.items))
      .catch(() => setLoadError(t("record.loadErrorTasks")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <button onClick={() => window.location.reload()}>{t("record.reloadBtn")}</button>
      </main>
    );
  }

  if (!tasks || participantId === null) {
    return <main className="page"><p>{t("record.loading")}</p></main>;
  }

  if (tasks.length === 0) {
    return (
      <main className="page">
        <p>{t("record.noTasks")}</p>
        <Link to="/">{t("record.backHome")}</Link>
      </main>
    );
  }

  if (index >= tasks.length) {
    return (
      <main className="page">
        <h1>{t("record.allDoneTitle")}</h1>
        <p>{t("record.allDoneText")}</p>
        <button className="primary" onClick={() => setIndex(0)}>{t("record.restartBtn")}</button>{" "}
        <Link to="/">{t("record.backHome")}</Link>
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
      setSaveError(e instanceof ApiError ? e.message : t("record.saveErrorFallback"));
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
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(index / tasks.length) * 100}%` }} />
      </div>
      <p className="progress-label">{t("record.progress", { i: index + 1, n: tasks.length })}</p>

      <div className="phrase-card">
        <span className="command-tag">{localizedCommandTitle(lang, task.command_code, task.command_title)}</span>
        <p className="phrase-text">{task.text}</p>
      </div>

      <div className={`status-badge status-${recorder.state}`}>
        <span className="status-dot" />
        {t(`record.state.${recorder.state}`)}
      </div>
      {recorder.state === "error" && <p className="error">{recorder.error}</p>}

      <div className="record-controls">
        {recorder.state === "idle" && (
          <button className="record-button" onClick={recorder.start}>
            <span className="icon-dot" /> {t("record.recordBtn")}
          </button>
        )}
        {recorder.state === "recording" && (
          <button className="record-button recording" onClick={recorder.stop}>
            <span className="icon-square" /> {t("record.stopBtn")}
          </button>
        )}
        {recorder.state === "error" && <button onClick={recorder.reset}>{t("record.retryMicBtn")}</button>}
      </div>

      {recorder.state === "recorded" && playbackUrl && (
        <div className="playback-card">
          <audio src={playbackUrl} controls />
          <div className="record-controls">
            <button onClick={recorder.reset}>{t("record.rerecordBtn")}</button>
            <button className="primary" disabled={saving} onClick={handleSave}>
              {saving ? t("record.savingBtn") : t("record.saveBtn")}
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <p className="error">
          {saveError} <button onClick={handleSave}>{t("record.retrySendBtn")}</button>
        </p>
      )}

      <p><button className="link-button" onClick={handleSkip}>{t("record.skipBtn")}</button></p>
    </main>
  );
}
