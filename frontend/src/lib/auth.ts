import { AUTH_ACCESS_KEY, AUTH_REFRESH_KEY } from "./api";

/** Wird nach Login/Logout ausgelöst, damit `SessionNav` ohne Effect neu rendert. */
export const AUTH_CHANGED_EVENT = "lectur-auth-changed";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_ACCESS_KEY);
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_ACCESS_KEY);
  sessionStorage.removeItem(AUTH_REFRESH_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
