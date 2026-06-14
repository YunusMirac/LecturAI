import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/courses/[courseId]/route";

const COURSE_ID = "33333333-3333-4333-8333-333333333333";
const TEACHER_ID = "11111111-1111-4111-8111-111111111111";

const mockRequireManagedCourse = vi.fn();
const mockUpdateSingle = vi.fn();
const mockDeleteEq = vi.fn();

vi.mock("@/lib/server/require-managed-course", () => ({
  requireManagedCourse: (...args: unknown[]) => mockRequireManagedCourse(...args),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "courses") throw new Error(`unexpected table ${table}`);
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: mockUpdateSingle,
            }),
          }),
        }),
        delete: () => ({
          eq: mockDeleteEq,
        }),
      };
    },
  }),
}));

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("PATCH /api/courses/[courseId]", () => {
  beforeEach(() => {
    mockRequireManagedCourse.mockReset();
    mockUpdateSingle.mockReset();
  });

  it("returns auth error from requireManagedCourse", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
    });

    const res = await PATCH(
      new Request("http://localhost/api/courses/x", {
        method: "PATCH",
        body: JSON.stringify({ name: "Kurs" }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it("updates course for authorized user", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Alt", semester: null },
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: COURSE_ID,
        name: "Neu",
        semester: "WS 2026",
        created_at: "2026-01-01",
        updated_at: "2026-06-01",
      },
      error: null,
    });

    const res = await PATCH(
      new Request("http://localhost/api/courses/x", {
        method: "PATCH",
        body: JSON.stringify({ name: " Neu ", semester: " WS 2026 " }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.name).toBe("Neu");
  });

  it("returns 400 for empty name", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Alt", semester: null },
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });

    const res = await PATCH(
      new Request("http://localhost/api/courses/x", {
        method: "PATCH",
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ courseId: COURSE_ID }) },
    );
    expect((await readJson(res)).status).toBe(400);
  });
});

describe("DELETE /api/courses/[courseId]", () => {
  beforeEach(() => {
    mockRequireManagedCourse.mockReset();
    mockDeleteEq.mockReset();
  });

  it("deletes course for authorized user", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs", semester: null },
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockDeleteEq.mockResolvedValue({ error: null });

    const res = await DELETE(new Request("http://localhost/api/courses/x"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body.detail).toContain("Konten");
  });
});
