import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/register/route";

const mockMaybeSingle = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
    rpc: mockRpc,
  }),
}));

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

const future = new Date(Date.now() + 86400000).toISOString();

const validBody = {
  invite_token: "valid-token",
  email: "student@school.de",
  password: "password123",
  password_confirm: "password123",
};

describe("POST /api/register", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockCreateUser.mockReset();
    mockDeleteUser.mockReset();
    mockRpc.mockReset();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect((await readJson(res)).status).toBe(400);
  });

  it("returns 400 when invite token is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validBody, invite_token: "" }),
      }),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(400);
    expect(body.invite_token).toBeDefined();
  });

  it("returns 400 when passwords mismatch", async () => {
    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validBody, password_confirm: "other1234" }),
      }),
    );
    expect((await readJson(res)).status).toBe(400);
  });

  it("returns 400 for invalid invitation", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    expect((await readJson(res)).status).toBe(400);
  });

  it("returns 201 on successful registration", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "inv-1",
        email: "student@school.de",
        role: "student",
        course_id: "course-1",
        status: "pending",
        expires_at: future,
      },
      error: null,
    });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockRpc.mockResolvedValue({ error: null });

    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(201);
    expect(body.email).toBe("student@school.de");
    expect(mockRpc).toHaveBeenCalledWith("complete_invited_registration", {
      p_user_id: "user-1",
      p_email: "student@school.de",
      p_role: "student",
      p_invitation_id: "inv-1",
    });
  });

  it("rolls back auth user when RPC fails", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "inv-1",
        email: "student@school.de",
        role: "student",
        course_id: "course-1",
        status: "pending",
        expires_at: future,
      },
      error: null,
    });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockRpc.mockResolvedValue({ error: { message: "rpc failed" } });

    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    const { status } = await readJson(res);
    expect(status).toBe(500);
    expect(mockDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("returns 400 when email already registered", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "inv-1",
        email: "student@school.de",
        role: "student",
        course_id: null,
        status: "pending",
        expires_at: future,
      },
      error: null,
    });
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(400);
    expect(body.email).toBeDefined();
  });
});
