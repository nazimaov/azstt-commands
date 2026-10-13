// Random participant identity, kept in this browser's localStorage only — no name, no
// login (TZ p.10: "для каждого участника использовать случайный идентификатор, не
// требовать имя/фамилию"). The id itself comes from the server (POST /api/participants)
// because a Recording row needs an existing Participant row to reference.
import { createParticipant } from "../api/client";

const STORAGE_KEY = "azstt_participant_id";
const CONSENT_KEY = "azstt_consent_given";

export function getStoredParticipantId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export async function ensureParticipant(): Promise<string> {
  const existing = getStoredParticipantId();
  if (existing) return existing;
  const { id } = await createParticipant();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function hasGivenConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "1";
}

export function markConsentGiven(): void {
  localStorage.setItem(CONSENT_KEY, "1");
}
