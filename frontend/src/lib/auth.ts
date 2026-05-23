import {
  AUTH_ACCESS_KEY,
  AUTH_REFRESH_KEY,
  AUTH_USER_EMAIL_KEY,
  AUTH_USER_ROLE_KEY,
} from "@/lib/api/config";

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
  sessionStorage.removeItem(AUTH_USER_EMAIL_KEY);
  sessionStorage.removeItem(AUTH_USER_ROLE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** Für UI: E-Mail/Rolle nach Login in sessionStorage (kein erneuter Request). */
export function getStoredUserSession(): { email: string | null; role: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sessionStorage.getItem(AUTH_ACCESS_KEY)) return null;
    return {
      email: sessionStorage.getItem(AUTH_USER_EMAIL_KEY),
      role: sessionStorage.getItem(AUTH_USER_ROLE_KEY),
    };
  } catch {
    return null;
  }
}

export function roleLabelDe(role: string | null): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "teacher":
      return "Lehrkraft";
    case "student":
      return "Schüler:in";
    default:
      return "Nutzer:in";
  }
}
