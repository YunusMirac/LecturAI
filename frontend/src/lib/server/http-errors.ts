import { NextResponse } from "next/server";

export const GENERIC_SERVER_ERROR =
  "Ein interner Fehler ist aufgetreten. Bitte versuche es später erneut.";

export function notFoundResponse(detail = "Seite nicht verfügbar.") {
  return NextResponse.json({ detail }, { status: 404 });
}

/** Logs internally; never exposes DB/env details to the client. */
export function internalErrorResponse(context?: string, cause?: unknown) {
  if (context) {
    console.error(`[${context}]`, cause ?? "unknown");
  } else if (cause) {
    console.error(cause);
  }
  return NextResponse.json({ detail: GENERIC_SERVER_ERROR }, { status: 500 });
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { detail: "Zu viele Anfragen. Bitte warte kurz und versuche es erneut." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSec)) },
    },
  );
}

export function missingServiceRoleResponse(context?: string) {
  return internalErrorResponse(context ?? "config", "SUPABASE_SERVICE_ROLE_KEY missing");
}
