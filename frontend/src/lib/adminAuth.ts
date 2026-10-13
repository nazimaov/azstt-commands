// Admin Bearer token, entered once on /admin/login and kept in localStorage — same
// single-shared-token model as the backend (backend/app/auth.py), adequate for one
// maintainer moderating a pilot dataset.
const TOKEN_KEY = "azstt_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
