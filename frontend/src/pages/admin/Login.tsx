import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { adminListCommands } from "../../api/client";
import { useLang } from "../../lib/i18n";
import { setAdminToken } from "../../lib/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(tokenToTry: string) {
    setBusy(true);
    setError(null);
    try {
      await adminListCommands(tokenToTry);
      setAdminToken(tokenToTry);
      navigate("/admin/commands");
    } catch {
      setError(t("adminLogin.error"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Supports a direct "straight into the admin panel" bookmark/link:
    // /admin/login?token=... logs in automatically, so there's no typing on repeat visits.
    // The token is stripped from the address bar right away (replaceState, not a navigate)
    // so it doesn't linger visibly or get re-submitted on refresh.
    const urlToken = searchParams.get("token");
    if (!urlToken) return;
    setSearchParams({}, { replace: true });
    setToken(urlToken);
    handleSubmit(urlToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page">
      <h1>{t("adminLogin.title")}</h1>
      <input
        type="password"
        placeholder={t("adminLogin.placeholder")}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit(token)}
      />
      <button className="primary" disabled={!token || busy} onClick={() => handleSubmit(token)}>
        {t("adminLogin.submit")}
      </button>
      {error && <p className="error">{error}</p>}
    </main>
  );
}
