import { describe, expect, it } from "vitest";

import { buildPasswordResetRedirectUrl } from "@/lib/api/authApi";

describe("buildPasswordResetRedirectUrl", () => {
  it("builds callback url with reset-password next", () => {
    expect(buildPasswordResetRedirectUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/callback?next=%2Freset-password",
    );
  });

  it("strips trailing slash from origin", () => {
    expect(buildPasswordResetRedirectUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000/auth/callback?next=%2Freset-password",
    );
  });
});
