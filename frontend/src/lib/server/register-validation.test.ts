import { describe, expect, it } from "vitest";

import {
  validateInvitationForRegister,
  validateRegisterBody,
} from "@/lib/server/register-validation";

describe("validateRegisterBody", () => {
  it("accepts valid payload", () => {
    const result = validateRegisterBody({
      invite_token: " tok ",
      email: " User@Mail.de ",
      password: "12345678",
      password_confirm: "12345678",
    });
    expect(result).toEqual({
      inviteToken: "tok",
      email: "user@mail.de",
      password: "12345678",
    });
  });

  it("rejects missing token", () => {
    const result = validateRegisterBody({ email: "a@b.de", password: "12345678", password_confirm: "12345678" });
    expect("status" in result && result.status).toBe(400);
  });

  it("rejects missing email", () => {
    const result = validateRegisterBody({ invite_token: "t", password: "12345678", password_confirm: "12345678" });
    expect("status" in result && result.status).toBe(400);
  });

  it("rejects short password", () => {
    const result = validateRegisterBody({
      invite_token: "t",
      email: "a@b.de",
      password: "short",
      password_confirm: "short",
    });
    expect("status" in result && result.status).toBe(400);
  });

  it("rejects password mismatch", () => {
    const result = validateRegisterBody({
      invite_token: "t",
      email: "a@b.de",
      password: "12345678",
      password_confirm: "87654321",
    });
    expect("status" in result && result.status).toBe(400);
  });
});

describe("validateInvitationForRegister", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  const baseInv = {
    id: "inv-1",
    email: "student@school.de",
    role: "student",
    course_id: "course-1",
    status: "pending",
    expires_at: future,
  };

  it("accepts valid pending invitation", () => {
    const result = validateInvitationForRegister(baseInv, "student@school.de");
    expect(result).toEqual({ ok: true, profileRole: "student" });
  });

  it("maps teacher invitation role", () => {
    const result = validateInvitationForRegister(
      { ...baseInv, role: "teacher" },
      "student@school.de",
    );
    expect(result).toEqual({ ok: true, profileRole: "teacher" });
  });

  it("rejects null invitation", () => {
    expect("status" in validateInvitationForRegister(null, "a@b.de")).toBe(true);
  });

  it("rejects non-pending invitation", () => {
    expect(
      "status" in validateInvitationForRegister({ ...baseInv, status: "accepted" }, "student@school.de"),
    ).toBe(true);
  });

  it("rejects expired invitation", () => {
    expect(
      "status" in validateInvitationForRegister({ ...baseInv, expires_at: past }, "student@school.de"),
    ).toBe(true);
  });

  it("rejects email mismatch", () => {
    expect(
      "status" in validateInvitationForRegister(baseInv, "other@school.de"),
    ).toBe(true);
  });
});
