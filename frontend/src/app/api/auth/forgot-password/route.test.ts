import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/forgot-password/route";

const mockResetPasswordForEmail = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    mockResetPasswordForEmail.mockReset();
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "not-email" }),
      }),
    );
    expect((await readJson(res)).status).toBe(400);
  });

  it("sends reset email for valid request", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const res = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "user@school.de" }),
      }),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.detail).toContain("Falls ein Konto");
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("user@school.de", {
      redirectTo: "http://localhost:3000/auth/callback?next=%2Freset-password",
    });
  });

  it("returns 500 when supabase fails", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: "rate limit" } });

    const res = await POST(
      new Request("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "user@school.de" }),
      }),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(500);
    expect(body.detail).toBe("rate limit");
  });
});
