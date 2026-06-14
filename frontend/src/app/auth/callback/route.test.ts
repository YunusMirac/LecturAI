import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/auth/callback/route";

const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
  });

  it("redirects to login when code missing", async () => {
    const res = await GET(new Request("http://localhost:3000/auth/callback"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=auth");
  });

  it("redirects to next path after successful exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=abc&next=%2Freset-password",
      ),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/reset-password");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("redirects to login when exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error("invalid") });

    const res = await GET(
      new Request("http://localhost:3000/auth/callback?code=bad"),
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=auth");
  });

  it("blocks open redirect in next param", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const res = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=abc&next=https%3A%2F%2Fevil.test",
      ),
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });
});
