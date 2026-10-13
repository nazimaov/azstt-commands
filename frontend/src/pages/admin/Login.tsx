import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminListCommands } from "../../api/client";
import { setAdminToken } from "../../lib/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await adminListCommands(token);
      setAdminToken(token);
      navigate("/admin/commands");
    } catch {
      setError("Неверный токен");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>Вход в административный раздел</h1>
      <input
        type="password"
        placeholder="Admin-токен"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <button className="primary" disabled={!token || busy} onClick={handleSubmit}>Войти</button>
      {error && <p className="error">{error}</p>}
    </main>
  );
}
