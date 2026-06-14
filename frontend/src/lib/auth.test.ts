import { describe, expect, it } from "vitest";

import { roleLabelDe } from "@/lib/auth";

describe("roleLabelDe", () => {
  it("maps known roles to German labels", () => {
    expect(roleLabelDe("admin")).toBe("Admin");
    expect(roleLabelDe("teacher")).toBe("Lehrkraft");
    expect(roleLabelDe("student")).toBe("Schüler:in");
  });

  it("returns fallback for unknown or null role", () => {
    expect(roleLabelDe(null)).toBe("Nutzer:in");
    expect(roleLabelDe("unknown")).toBe("Nutzer:in");
    expect(roleLabelDe("")).toBe("Nutzer:in");
  });
});
