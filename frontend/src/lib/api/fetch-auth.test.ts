import { describe, expect, it } from "vitest";

import { parseApiDetail } from "@/lib/api/fetch-auth";

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
