import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET } from "@/app/api/courses/[courseId]/members/route";

const COURSE_ID = "33333333-3333-4333-8333-333333333333";
const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "44444444-4444-4444-8444-444444444444";

const mockCourseMaybeSingle = vi.fn();
const mockMembersOrder = vi.fn();
const mockInvitesOrder = vi.fn();
const mockRequireManagedCourse = vi.fn();
const mockProfileMaybeSingle = vi.fn();
const mockMembershipDeleteSelect = vi.fn();
const mockInviteUpdateSelect = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  getAuthenticatedProfile: vi.fn(),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "courses") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockCourseMaybeSingle,
            }),
          }),
        };
      }
      if (table === "course_members") {
        return {
          select: () => ({
            eq: () => ({
              order: mockMembersOrder,
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => ({
                select: mockMembershipDeleteSelect,
              }),
            }),
          }),
        };
      }
      if (table === "invitations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: mockInvitesOrder,
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  select: mockInviteUpdateSelect,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockProfileMaybeSingle,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/server/require-managed-course", () => ({
  requireManagedCourse: (...args: unknown[]) => mockRequireManagedCourse(...args),
}));

import { getAuthenticatedProfile } from "@/lib/server/api-helpers";

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("GET /api/courses/[courseId]/members", () => {
  beforeEach(() => {
    mockCourseMaybeSingle.mockReset();
    mockMembersOrder.mockReset();
    mockInvitesOrder.mockReset();
    vi.mocked(getAuthenticatedProfile).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Nicht angemeldet." }), { status: 401 }),
    });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid course id", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      user: { id: TEACHER_ID } as never,
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: "invalid" }),
    });
    expect((await readJson(res)).status).toBe(400);
  });

  it("returns 404 when course missing", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      user: { id: TEACHER_ID } as never,
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockCourseMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    expect((await readJson(res)).status).toBe(404);
  });

  it("returns 403 for non-owner teacher", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      user: { id: TEACHER_ID } as never,
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: "other-teacher", name: "Kurs" },
      error: null,
    });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    expect((await readJson(res)).status).toBe(403);
  });

  it("returns members for course owner", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      user: { id: TEACHER_ID } as never,
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Analysis I" },
      error: null,
    });
    mockMembersOrder.mockResolvedValue({
      data: [
        {
          student_id: "s1",
          joined_at: "2026-01-01T00:00:00Z",
          profiles: { email: "registered@school.de" },
        },
      ],
      error: null,
    });
    mockInvitesOrder.mockResolvedValue({
      data: [{ email: "pending@school.de", created_at: "2026-01-02T00:00:00Z" }],
      error: null,
    });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.course_name).toBe("Analysis I");
    expect(body.members).toHaveLength(2);
    expect(body.counts).toEqual({ registered: 1, pending: 1, total: 2 });
  });

  it("allows admin to view any course", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      user: { id: "admin-id" } as never,
      profile: { id: "admin-id", email: "a@school.de", role: "admin" },
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs" },
      error: null,
    });
    mockMembersOrder.mockResolvedValue({ data: [], error: null });
    mockInvitesOrder.mockResolvedValue({ data: [], error: null });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    expect((await readJson(res)).status).toBe(200);
  });

  it("returns 403 for students", async () => {
    vi.mocked(getAuthenticatedProfile).mockResolvedValue({
      user: { id: "student-id" } as never,
      profile: { id: "student-id", email: "s@school.de", role: "student" },
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs" },
      error: null,
    });

    const res = await GET(new Request("http://localhost/api/courses/x/members"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    expect((await readJson(res)).status).toBe(403);
  });
});

describe("DELETE /api/courses/[courseId]/members", () => {
  beforeEach(() => {
    mockRequireManagedCourse.mockReset();
    mockProfileMaybeSingle.mockReset();
    mockMembershipDeleteSelect.mockReset();
    mockInviteUpdateSelect.mockReset();
  });

  it("returns auth error from requireManagedCourse", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
    });

    const res = await DELETE(
      new Request("http://localhost/api/courses/x/members", {
        method: "DELETE",
        body: JSON.stringify({ email: "student@school.de" }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it("removes registered membership", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs", semester: null },
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockProfileMaybeSingle.mockResolvedValue({ data: { id: STUDENT_ID }, error: null });
    mockMembershipDeleteSelect.mockResolvedValue({
      data: [{ student_id: STUDENT_ID }],
      error: null,
    });
    mockInviteUpdateSelect.mockResolvedValue({ data: [], error: null });

    const res = await DELETE(
      new Request("http://localhost/api/courses/x/members", {
        method: "DELETE",
        body: JSON.stringify({ email: "student@school.de" }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.removed_membership).toBe(true);
    expect(body.detail).toContain("Login-Konto bleibt bestehen");
  });

  it("revokes pending invitation", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs", semester: null },
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInviteUpdateSelect.mockResolvedValue({ data: [{ id: "inv-1" }], error: null });

    const res = await DELETE(
      new Request("http://localhost/api/courses/x/members", {
        method: "DELETE",
        body: JSON.stringify({ email: "pending@school.de" }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.revoked_invitation).toBe(true);
  });

  it("returns 404 when nothing to remove", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs", semester: null },
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInviteUpdateSelect.mockResolvedValue({ data: [], error: null });

    const res = await DELETE(
      new Request("http://localhost/api/courses/x/members", {
        method: "DELETE",
        body: JSON.stringify({ email: "unknown@school.de" }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    expect((await readJson(res)).status).toBe(404);
  });
});
