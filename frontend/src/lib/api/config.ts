/** Basis-URL des Django-Backends (ohne trailing slash). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export const AUTH_ACCESS_KEY = "lectur_access";
export const AUTH_REFRESH_KEY = "lectur_refresh";
/** Nach Login: Anzeige in SessionNav / Dashboard */
export const AUTH_USER_EMAIL_KEY = "lectur_user_email";
export const AUTH_USER_ROLE_KEY = "lectur_user_role";
