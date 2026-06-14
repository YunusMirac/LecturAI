import { describe, expect, it } from "vitest";

import { parseInvitationError } from "@/lib/api/invitationsApi";

describe("parseInvitationError", () => {
  it("parses detail string", () => {
    expect(parseInvitationError({ detail: "Keine Berechtigung" })).toBe("Keine Berechtigung");
  });

  it("parses email field errors", () => {
    expect(parseInvitationError({ email: ["Ungültige E-Mail"] })).toBe("Ungültige E-Mail");
  });

  it("parses course_id field errors", () => {
    expect(parseInvitationError({ course_id: ["Kurs fehlt"] })).toBe("Kurs fehlt");
  });

  it("returns fallback for invalid payloads", () => {
    expect(parseInvitationError(null)).toBe("Einladung fehlgeschlagen.");
    expect(parseInvitationError({})).toBe("Einladung fehlgeschlagen.");
  });
});
