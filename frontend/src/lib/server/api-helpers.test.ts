import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  frontendRegisterUrl,
  generateInviteToken,
} from "@/lib/server/api-helpers";

describe("api-helpers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("generateInviteToken", () => {
    it("returns a non-empty base64url string", () => {
      const token = generateInviteToken();
      expect(token.length).toBeGreaterThan(20);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("generates unique tokens", () => {
      const a = generateInviteToken();
      const b = generateInviteToken();
      expect(a).not.toBe(b);
    });
  });

  describe("frontendRegisterUrl", () => {
    it("builds register URL with encoded token", () => {
      const url = frontendRegisterUrl("abc+token/test");
      expect(url).toBe("http://localhost:3000/register?invite_token=abc%2Btoken%2Ftest");
    });

    it("strips trailing slash from site URL", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000/");
      expect(frontendRegisterUrl("tok")).toBe("http://localhost:3000/register?invite_token=tok");
    });
  });
});
