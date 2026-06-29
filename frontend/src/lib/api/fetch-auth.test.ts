import { describe, expect, it, vi } from "vitest";

import { apiFetch, parseApiDetail } from "@/lib/api/fetch-auth";

vi.mock("@/lib/api/authApi", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

describe("parseApiDetail", () => {
  it("extracts detail string", () => {
    expect(parseApiDetail({ detail: "Fehler" }, "Fallback")).toBe("Fehler");
  });

  it("uses fallback when detail missing or wrong type", () => {
    expect(parseApiDetail({}, "Fallback")).toBe("Fallback");
    expect(parseApiDetail(null, "Fallback")).toBe("Fallback");
    expect(parseApiDetail({ detail: 42 }, "Fallback")).toBe("Fallback");
  });
});

describe("apiFetch", () => {
  it("returns notFound on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Seite nicht verfügbar." }),
      }),
    );

    const result = await apiFetch("/api/test", { fallback: "Fehler" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.notFound).toBe(true);
      expect(result.message).toBe("Seite nicht verfügbar.");
    }

    vi.unstubAllGlobals();
  });
});
