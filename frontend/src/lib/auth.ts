/** Wird nach Login/Logout ausgelöst, damit Navigation neu rendert. */
export const AUTH_CHANGED_EVENT = "lectur-auth-changed";

export type ProfileRole = "admin" | "teacher" | "student";

export type UserSession = {
  email: string | null;
  role: ProfileRole | null;
  userId: string | null;
};

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

export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}
