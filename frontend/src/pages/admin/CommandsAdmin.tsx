import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminAddPhrase, adminCreateCommand, adminListCommands, adminUpdateCommand, adminUpdatePhrase, Command } from "../../api/client";
import { clearAdminToken, getAdminToken } from "../../lib/adminAuth";

const STATUS_OPTIONS = ["active", "disabled", "archived"] as const;

export default function CommandsAdmin() {
  const navigate = useNavigate();
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
      setError("Не удалось загрузить команды");
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
      setError(e instanceof Error ? e.message : "Не удалось создать команду");
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
    const text = window.prompt("Новый текст фразы (создаст новую версию):", currentText ?? "");
    if (!text || text === currentText) return;
    await adminUpdatePhrase(adminToken, phraseId, { text });
    reload();
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

      <h1>Управление командами</h1>
      {error && <p className="error">{error}</p>}

      <section className="admin-card">
        <h2>Новая команда</h2>
        <input placeholder="код (например volume_up)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
        <input placeholder="название" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <textarea
          placeholder="фразы, по одной на строку"
          value={newPhrases}
          onChange={(e) => setNewPhrases(e.target.value)}
        />
        <button className="primary" disabled={!newCode || !newTitle} onClick={handleCreateCommand}>
          Добавить команду
        </button>
      </section>

      {commands.map((command) => (
        <section key={command.id} className="admin-card">
          <h2>{command.title} <code>{command.code}</code></h2>
          <label>
            Статус:{" "}
            <select value={command.status} onChange={(e) => handleStatusChange(command.id, e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <ul className="phrase-list">
            {command.phrases.map((phrase) => (
              <li key={phrase.id}>
                <span className={phrase.enabled ? "" : "phrase-disabled"}>{phrase.current_text}</span>
                {" "}— {phrase.recordings_count} записей (версий: {phrase.versions.length})
                <button onClick={() => handleEditPhraseText(phrase.id, phrase.current_text)}>Изменить текст</button>
                <button onClick={() => handleTogglePhrase(phrase.id, !phrase.enabled)}>
                  {phrase.enabled ? "Отключить" : "Включить"}
                </button>
              </li>
            ))}
          </ul>

          <input
            placeholder="новая фраза"
            value={newPhraseByCommand[command.id] || ""}
            onChange={(e) => setNewPhraseByCommand((s) => ({ ...s, [command.id]: e.target.value }))}
          />
          <button onClick={() => handleAddPhrase(command.id)}>Добавить фразу</button>
        </section>
      ))}
    </main>
  );
}
