import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/me/route";

const mockGetAuthenticatedProfile = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
}));

describe("GET /api/me", () => {
  const req = new Request("http://localhost/api/me");

  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Nicht angemeldet." }), { status: 401 }),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns the profile on success", async () => {
    const profile = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "user@school.de",
      role: "teacher",
    };
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(profile);
  });

  it("passes the request object to getAuthenticatedProfile", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(null, { status: 401 }),
    });
    await GET(req);
    expect(mockGetAuthenticatedProfile).toHaveBeenCalledWith(req);
  });
});
