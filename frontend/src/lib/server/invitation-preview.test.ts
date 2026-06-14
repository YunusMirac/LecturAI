import { describe, expect, it } from "vitest";

import { buildInvitationPreview } from "@/lib/server/invitation-preview";

describe("buildInvitationPreview", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  it("returns preview for valid pending teacher invitation", () => {
    const result = buildInvitationPreview({
      email: " Teacher@School.de ",
      role: "teacher",
      status: "pending",
      expires_at: future,
    });
    expect(result).toEqual({
      ok: true,
      preview: {
        email: "teacher@school.de",
        role: "teacher",
        expires_at: future,
      },
    });
  });

  it("returns preview for student invitation", () => {
    const result = buildInvitationPreview({
      email: "s@school.de",
      role: "student",
      status: "pending",
      expires_at: future,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.preview.role).toBe("student");
  });

  it("returns 404 for missing invitation", () => {
    expect(buildInvitationPreview(null)).toEqual({ ok: false, status: 404 });
  });

  it("returns 400 for accepted invitation", () => {
    expect(
      buildInvitationPreview({
        email: "a@b.de",
        role: "teacher",
        status: "accepted",
        expires_at: future,
      }),
    ).toEqual({ ok: false, status: 400 });
  });

  it("returns 400 for expired invitation", () => {
    expect(
      buildInvitationPreview({
        email: "a@b.de",
        role: "student",
        status: "pending",
        expires_at: past,
      }),
    ).toEqual({ ok: false, status: 400 });
  });

  it("returns 400 for invalid role", () => {
    expect(
      buildInvitationPreview({
        email: "a@b.de",
        role: "admin",
        status: "pending",
        expires_at: future,
      }),
    ).toEqual({ ok: false, status: 400 });
  });
});
