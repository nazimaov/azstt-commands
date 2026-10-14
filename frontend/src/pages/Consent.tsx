import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { giveConsent } from "../api/client";
import { useLang } from "../lib/i18n";
import { ensureParticipant, markConsentGiven } from "../lib/participant";

const TERMS_VERSION = "v1";

export default function Consent() {
  const navigate = useNavigate();
  const { t } = useLang();
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
      setError(t("consent.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>{t("consent.title")}</h1>
      <div className="info-card">
        <p>{t("consent.p1")}</p>
        <p>{t("consent.p2")}</p>
      </div>

      <div className="consent-options">
        <label className="checkbox-row">
          <input type="checkbox" checked={collection} onChange={(e) => setCollection(e.target.checked)} />
          <span>{t("consent.collection")} <em>{t("consent.collectionRequired")}</em></span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={trainingUse} onChange={(e) => setTrainingUse(e.target.checked)} />
          <span>{t("consent.training")}</span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={publicDistribution}
            onChange={(e) => setPublicDistribution(e.target.checked)}
          />
          <span>{t("consent.publicDist")}</span>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="primary large" disabled={!collection || busy} onClick={handleSubmit}>
        {t("consent.submit")}
      </button>
    </main>
  );
}
