/** Basis-URL des Django-Backends (ohne trailing slash). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export const AUTH_ACCESS_KEY = "lectur_access";
export const AUTH_REFRESH_KEY = "lectur_refresh";
