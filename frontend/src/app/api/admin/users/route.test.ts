import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/admin/users/route";

const mockGetAuthenticatedProfile = vi.fn();
const mockProfilesSelect = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        order: mockProfilesSelect,
      }),
    }),
  }),
}));

const adminProfile = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "admin@school.de",
  role: "admin" as const,
};

const teacherProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "teacher@school.de",
  role: "teacher" as const,
};

describe("GET /api/admin/users", () => {
  const req = new Request("http://localhost/api/admin/users");

  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockProfilesSelect.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Nicht angemeldet." }), { status: 401 }),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: teacherProfile });
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.detail).toContain("Admin");
  });

  it("returns 500 on DB error", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: adminProfile });
    mockProfilesSelect.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("returns user list for admin", async () => {
    const users = [
      { id: adminProfile.id, email: adminProfile.email, role: "admin", created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: teacherProfile.id, email: teacherProfile.email, role: "teacher", created_at: "2026-01-02", updated_at: "2026-01-02" },
    ];
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: adminProfile });
    mockProfilesSelect.mockResolvedValue({ data: users, error: null });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].email).toBe(adminProfile.email);
  });

  it("returns empty array when no users exist", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: adminProfile });
    mockProfilesSelect.mockResolvedValue({ data: null, error: null });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});
