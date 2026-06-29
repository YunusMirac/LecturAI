import { describe, expect, it, beforeEach } from "vitest";

import { checkRateLimit, enforceRateLimit, resetRateLimitStore } from "@/lib/server/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    expect(checkRateLimit("k1", { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit("k1", { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit("k1", { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("blocks when limit exceeded", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit("k2", { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    }
    const blocked = checkRateLimit("k2", { limit: 3, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("returns 429 response from enforceRateLimit", async () => {
    const req = new Request("http://localhost/api/register", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    for (let i = 0; i < 5; i += 1) {
      expect(enforceRateLimit(req, "register", 5, 60_000)).toBeNull();
    }
    const limited = enforceRateLimit(req, "register", 5, 60_000);
    expect(limited?.status).toBe(429);
  });
});
