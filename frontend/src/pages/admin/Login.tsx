import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminListCommands } from "../../api/client";
import { useLang } from "../../lib/i18n";
import { setAdminToken } from "../../lib/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useLang();
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
      setError(t("adminLogin.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>{t("adminLogin.title")}</h1>
      <input
        type="password"
        placeholder={t("adminLogin.placeholder")}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <button className="primary" disabled={!token || busy} onClick={handleSubmit}>{t("adminLogin.submit")}</button>
      {error && <p className="error">{error}</p>}
    </main>
  );
}
