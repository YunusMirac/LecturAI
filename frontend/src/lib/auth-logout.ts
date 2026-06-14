import { signOut } from "@/lib/api/authApi";

export type LogoutRedirect = "/login" | "/";

type LogoutNavigate = (path: LogoutRedirect) => void;

/**
 * Session beenden und weiterleiten.
 * Mit `navigate` (router.replace) bleibt die Dev-HMR-Verbindung stabil;
 * ohne `navigate` Fallback per vollem Seitenreload.
 */
export async function performLogout(
  redirectTo: LogoutRedirect = "/login",
  navigate?: LogoutNavigate,
): Promise<void> {
  await signOut();
  if (navigate) {
    navigate(redirectTo);
    return;
  }
  if (typeof window !== "undefined") {
    window.location.assign(redirectTo);
  }
}
