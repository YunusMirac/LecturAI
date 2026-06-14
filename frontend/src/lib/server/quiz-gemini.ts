/** Stable models with PDF support; gemini-2.0-flash was shut down (June 2026). */
export const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
] as const;

export function resolveGeminiModelCandidates(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const envFallbacks = process.env.GEMINI_MODEL_FALLBACKS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ordered = [envModel, ...(envFallbacks ?? []), ...GEMINI_MODEL_FALLBACKS].filter(
    Boolean,
  ) as string[];
  return [...new Set(ordered)];
}

export function parseGeminiRetryDelayMs(message: string): number | null {
  const inline = message.match(/retry in ([0-9.]+)s/i);
  if (inline) return Math.ceil(Number(inline[1]) * 1000);
  const json = message.match(/retryDelay":"(\d+)s"/i);
  if (json) return Number(json[1]) * 1000;
  return null;
}

export function isGeminiQuotaError(message: string): boolean {
  return /429|quota exceeded|rate.?limit/i.test(message);
}

export function isGeminiModelUnavailableError(message: string): boolean {
  if (/404|not found|shut down|deprecated|has been shut down/i.test(message)) return true;
  if (/429/.test(message) && /limit:\s*0/i.test(message) && /FreeTier|free_tier/i.test(message)) {
    return true;
  }
  return false;
}

export function toUserFacingGeminiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("GEMINI_API_KEY fehlt")) return msg;

  if (/gemini-2\.0-flash/i.test(msg) && isGeminiModelUnavailableError(msg)) {
    return (
      "Modell gemini-2.0-flash ist abgeschaltet. Entferne GEMINI_MODEL aus .env.local " +
      "oder setze GEMINI_MODEL=gemini-2.5-flash und starte den Dev-Server neu."
    );
  }

  if (isGeminiModelUnavailableError(msg)) {
    return (
      "Kein verfügbares Gemini-Modell (Free Tier). Setze GEMINI_MODEL=gemini-2.5-flash " +
      "in .env.local — siehe docs/QUIZ_AI.md."
    );
  }

  if (isGeminiQuotaError(msg)) {
    const delay = parseGeminiRetryDelayMs(msg);
    if (delay !== null && delay <= 120_000) {
      return `Gemini-Rate-Limit — bitte ${Math.ceil(delay / 1000)} Sekunden warten und Quiz neu erstellen.`;
    }
    return "Gemini-Tageslimit erreicht. Später erneut versuchen oder Billing in Google AI Studio prüfen.";
  }

  const firstLine = msg.split("\n")[0]?.trim() ?? msg;
  if (firstLine.length > 280) {
    return `${firstLine.slice(0, 277)}…`;
  }
  return firstLine || "Quiz-Generierung fehlgeschlagen.";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
