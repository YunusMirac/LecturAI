import { describe, expect, it } from "vitest";

import { isRecord } from "@/lib/api/guards";

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns false for null and primitives", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord("x")).toBe(false);
    expect(isRecord(42)).toBe(false);
  });

  it("returns true for arrays (typeof object)", () => {
    expect(isRecord([])).toBe(true);
  });
});
