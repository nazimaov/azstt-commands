import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminAddPhrase, adminCreateCommand, adminListCommands, adminUpdateCommand, adminUpdatePhrase, Command } from "../../api/client";
import { useLang } from "../../lib/i18n";
import { clearAdminToken, getAdminToken } from "../../lib/adminAuth";

const STATUS_OPTIONS = ["active", "disabled", "archived"] as const;

export default function CommandsAdmin() {
  const navigate = useNavigate();
  const { t } = useLang();
  const token = getAdminToken();

  const [commands, setCommands] = useState<Command[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPhrases, setNewPhrases] = useState("");
  const [newPhraseByCommand, setNewPhraseByCommand] = useState<Record<string, string>>({});

  async function reload() {
    if (!token) return;
    try {
      setCommands(await adminListCommands(token));
    } catch {
      setError(t("admin.loadError"));
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return null;
  const adminToken: string = token; // narrows string|null -> string for the closures below

  async function handleCreateCommand() {
    try {
      await adminCreateCommand(adminToken, {
        code: newCode.trim(),
        title: newTitle.trim(),
        phrases: newPhrases.split("\n").map((p) => p.trim()).filter(Boolean),
      });
      setNewCode("");
      setNewTitle("");
      setNewPhrases("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.createError"));
    }
  }

  async function handleStatusChange(commandId: string, status: string) {
    await adminUpdateCommand(adminToken, commandId, { status });
    reload();
  }

  async function handleAddPhrase(commandId: string) {
    const text = (newPhraseByCommand[commandId] || "").trim();
    if (!text) return;
    await adminAddPhrase(adminToken, commandId, text);
    setNewPhraseByCommand((s) => ({ ...s, [commandId]: "" }));
    reload();
  }

  async function handleTogglePhrase(phraseId: string, enabled: boolean) {
    await adminUpdatePhrase(adminToken, phraseId, { enabled });
    reload();
  }

  async function handleEditPhraseText(phraseId: string, currentText: string | null) {
    const text = window.prompt(t("admin.editPromptLabel"), currentText ?? "");
    if (!text || text === currentText) return;
    await adminUpdatePhrase(adminToken, phraseId, { text });
    reload();
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

      <h1>{t("admin.title")}</h1>
      {error && <p className="error">{error}</p>}

      <section className="admin-card">
        <h2>{t("admin.newCommand")}</h2>
        <input placeholder={t("admin.codePlaceholder")} value={newCode} onChange={(e) => setNewCode(e.target.value)} />
        <input placeholder={t("admin.titlePlaceholder")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <textarea
          placeholder={t("admin.phrasesPlaceholder")}
          value={newPhrases}
          onChange={(e) => setNewPhrases(e.target.value)}
        />
        <button className="primary" disabled={!newCode || !newTitle} onClick={handleCreateCommand}>
          {t("admin.addCommand")}
        </button>
      </section>

      {commands.map((command) => (
        <section key={command.id} className="admin-card">
          <div className="command-header">
            <h2>{command.title} <code>{command.code}</code></h2>
            <span className={`status-badge status-badge-command-${command.status}`}>
              <span className="status-dot" />
              {t(`status.${command.status}`)}
            </span>
          </div>
          <label>
            {t("admin.status")}{" "}
            <select value={command.status} onChange={(e) => handleStatusChange(command.id, e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </label>

          <ul className="phrase-list">
            {command.phrases.map((phrase) => (
              <li key={phrase.id} className="phrase-row">
                <div>
                  <span className={phrase.enabled ? "" : "phrase-disabled"}>{phrase.current_text}</span>
                  <span className="phrase-meta">
                    {t("admin.recordingsCount", { n: phrase.recordings_count, v: phrase.versions.length })}
                  </span>
                </div>
                <div className="phrase-actions">
                  <button onClick={() => handleEditPhraseText(phrase.id, phrase.current_text)}>{t("admin.editText")}</button>
                  <button onClick={() => handleTogglePhrase(phrase.id, !phrase.enabled)}>
                    {phrase.enabled ? t("admin.disable") : t("admin.enable")}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="inline-form">
            <input
              placeholder={t("admin.newPhrasePlaceholder")}
              value={newPhraseByCommand[command.id] || ""}
              onChange={(e) => setNewPhraseByCommand((s) => ({ ...s, [command.id]: e.target.value }))}
            />
            <button onClick={() => handleAddPhrase(command.id)}>{t("admin.addPhrase")}</button>
          </div>
        </section>
      ))}
    </main>
  );
}
