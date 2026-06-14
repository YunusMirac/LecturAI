import { describe, expect, it } from "vitest";

import {
  passwordValidationErrorMessage,
  validateForgotPasswordEmail,
  validatePasswordFields,
} from "@/lib/server/password-validation";

describe("validatePasswordFields", () => {
  it("accepts matching passwords with min length", () => {
    expect(validatePasswordFields("12345678", "12345678")).toEqual({ password: "12345678" });
  });

  it("rejects short password", () => {
    const r = validatePasswordFields("short", "short");
    expect(r).toMatchObject({ status: 400 });
  });

  it("rejects mismatch", () => {
    const r = validatePasswordFields("12345678", "87654321");
    expect(r).toMatchObject({ status: 400 });
  });
});

describe("validateForgotPasswordEmail", () => {
  it("normalizes email", () => {
    expect(validateForgotPasswordEmail(" User@School.de ")).toEqual({
      ok: true,
      email: "user@school.de",
    });
  });

  it("rejects invalid email", () => {
    expect(validateForgotPasswordEmail("not-email")).toMatchObject({ status: 400 });
  });
});

describe("passwordValidationErrorMessage", () => {
  it("returns first field error", () => {
    expect(
      passwordValidationErrorMessage({
        password: ["Zu kurz"],
        password_confirm: ["Unequal"],
      }),
    ).toBe("Zu kurz");
  });
});
