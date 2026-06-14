import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isGeminiModelUnavailableError,
  isGeminiQuotaError,
  parseGeminiRetryDelayMs,
  resolveGeminiModelCandidates,
  toUserFacingGeminiError,
} from "@/lib/server/quiz-gemini";

describe("parseGeminiRetryDelayMs", () => {
  it("parses inline retry hint", () => {
    expect(parseGeminiRetryDelayMs("Please retry in 46.78153399s.")).toBe(46_782);
  });

  it("parses JSON retryDelay", () => {
    expect(parseGeminiRetryDelayMs('{"retryDelay":"46s"}')).toBe(46_000);
  });
});

describe("isGeminiModelUnavailableError", () => {
  it("detects free tier limit 0", () => {
    const msg =
      "[429] Quota exceeded generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash FreeTier";
    expect(isGeminiModelUnavailableError(msg)).toBe(true);
  });
});

describe("toUserFacingGeminiError", () => {
  it("maps deprecated gemini-2.0-flash to actionable hint", () => {
    const msg =
      "[429] limit: 0, model: gemini-2.0-flash FreeTier generativelanguage.googleapis.com/generate_content_free_tier_requests";
    const out = toUserFacingGeminiError(new Error(msg));
    expect(out).toContain("gemini-2.0-flash");
    expect(out).toContain("gemini-2.5-flash");
  });
});

describe("resolveGeminiModelCandidates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers GEMINI_MODEL then fallbacks without duplicates", () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    const models = resolveGeminiModelCandidates();
    expect(models[0]).toBe("gemini-2.5-flash");
    expect(new Set(models).size).toBe(models.length);
  });
});

describe("isGeminiQuotaError", () => {
  it("detects 429 responses", () => {
    expect(isGeminiQuotaError("[429 Too Many Requests]")).toBe(true);
  });

  it("detects quota exceeded wording", () => {
    expect(isGeminiQuotaError("Quota exceeded for metric")).toBe(true);
  });
});

describe("parseGeminiRetryDelayMs edge cases", () => {
  it("returns null when no delay present", () => {
    expect(parseGeminiRetryDelayMs("generic error")).toBeNull();
  });
});

describe("toUserFacingGeminiError quota cases", () => {
  it("suggests wait time for short retry window", () => {
    const out = toUserFacingGeminiError(new Error("429 Please retry in 30s."));
    expect(out).toContain("30 Sekunden");
  });

  it("suggests daily limit for long-running quota errors", () => {
    const out = toUserFacingGeminiError(new Error("429 Quota exceeded without retry"));
    expect(out).toContain("Tageslimit");
  });
});

describe("resolveGeminiModelCandidates with fallbacks env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes custom GEMINI_MODEL_FALLBACKS", () => {
    vi.stubEnv("GEMINI_MODEL", "custom-model");
    vi.stubEnv("GEMINI_MODEL_FALLBACKS", "fallback-a,fallback-b");
    const models = resolveGeminiModelCandidates();
    expect(models.slice(0, 3)).toEqual(["custom-model", "fallback-a", "fallback-b"]);
  });
});
