import { describe, expect, it } from "vitest";

import { parseRegisterError } from "@/lib/api/authApi";

describe("parseRegisterError", () => {
  it("parses invite_token errors", () => {
    expect(parseRegisterError({ invite_token: ["Token ungültig"] })).toBe("Token ungültig");
  });

  it("parses email errors", () => {
    expect(parseRegisterError({ email: ["E-Mail falsch"] })).toBe("E-Mail falsch");
  });

  it("parses password errors", () => {
    expect(parseRegisterError({ password: ["Zu kurz"] })).toBe("Zu kurz");
  });

  it("parses password_confirm errors", () => {
    expect(parseRegisterError({ password_confirm: ["Unequal"] })).toBe("Unequal");
  });

  it("parses detail string", () => {
    expect(parseRegisterError({ detail: "Serverfehler" })).toBe("Serverfehler");
  });

  it("returns fallback for unknown payloads", () => {
    expect(parseRegisterError(null)).toBe("Registrierung fehlgeschlagen.");
    expect(parseRegisterError({})).toBe("Registrierung fehlgeschlagen.");
  });
});
