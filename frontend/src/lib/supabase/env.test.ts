import { describe, expect, it, vi } from "vitest";

describe("getSupabasePublicKey", () => {
  it("prefers publishable key over anon jwt", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "jwt-anon-test");

    const { getSupabasePublicKey } = await import("@/lib/supabase/env");
    expect(getSupabasePublicKey()).toBe("sb_publishable_test");
    vi.unstubAllEnvs();
  });

  it("falls back to anon key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "jwt-anon-test");

    const { getSupabasePublicKey } = await import("@/lib/supabase/env");
    expect(getSupabasePublicKey()).toBe("jwt-anon-test");
    vi.unstubAllEnvs();
  });
});

describe("resolveSiteOrigin", () => {
  it("uses request origin first", async () => {
    const { resolveSiteOrigin } = await import("@/lib/supabase/env");
    const req = new Request("http://ignored", {
      headers: { origin: "http://localhost:3000/" },
    });
    expect(resolveSiteOrigin(req)).toBe("http://localhost:3000");
  });
});
