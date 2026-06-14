import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/invitations/preview/route";

const mockMaybeSingle = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("GET /api/invitations/preview", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns 400 when token is missing", async () => {
    const res = await GET(new Request("http://localhost/api/invitations/preview"));
    const { status, body } = await readJson(res);
    expect(status).toBe(400);
    expect(body.detail).toBe("Einladungstoken fehlt.");
  });

  it("accepts invite_token query param", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    mockMaybeSingle.mockResolvedValue({
      data: { email: "s@school.de", role: "student", status: "pending", expires_at: future },
      error: null,
    });

    const res = await GET(
      new Request("http://localhost/api/invitations/preview?invite_token=abc"),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.email).toBe("s@school.de");
    expect(body.role).toBe("student");
  });

  it("returns 404 for unknown token", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await GET(new Request("http://localhost/api/invitations/preview?token=missing"));
    expect((await readJson(res)).status).toBe(404);
  });

  it("returns 400 for expired invitation", async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    mockMaybeSingle.mockResolvedValue({
      data: { email: "a@b.de", role: "teacher", status: "pending", expires_at: past },
      error: null,
    });
    const res = await GET(new Request("http://localhost/api/invitations/preview?token=expired"));
    expect((await readJson(res)).status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const res = await GET(new Request("http://localhost/api/invitations/preview?token=x"));
    const { status, body } = await readJson(res);
    expect(status).toBe(500);
    expect(body.detail).toBe("db down");
  });
});
