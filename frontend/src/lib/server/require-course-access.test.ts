import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireCourseAccess } from "@/lib/server/require-course-access";
import { COURSE_ID, TEACHER_ID, STUDENT_ID } from "@/lib/server/quiz-fixtures";

const mockGetAuthenticatedProfile = vi.fn();
const mockCourseMaybeSingle = vi.fn();
const mockLoadCourseMembership = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockCourseMaybeSingle,
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/server/access/course-membership", () => ({
  loadCourseMembership: (...args: unknown[]) => mockLoadCourseMembership(...args),
}));

const teacherProfile = { id: TEACHER_ID, email: "t@school.de", role: "teacher" as const };
const studentProfile = { id: STUDENT_ID, email: "s@school.de", role: "student" as const };
const courseRow = {
  id: COURSE_ID,
  teacher_id: TEACHER_ID,
  name: "Informatik 1",
  semester: "WS 2025",
  created_at: "2026-01-01",
};

describe("requireCourseAccess", () => {
  const req = new Request("http://localhost/api/courses/" + COURSE_ID);

  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockCourseMaybeSingle.mockReset();
    mockLoadCourseMembership.mockReset();
  });

  it("returns 400 for invalid course ID", async () => {
    const result = await requireCourseAccess(req, "not-a-uuid");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(400);
  });

  it("passes through authentication error", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    });
    const result = await requireCourseAccess(req, COURSE_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(401);
  });

  it("returns 500 when course DB query errors", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: teacherProfile });
    mockCourseMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "db exploded" },
    });
    const result = await requireCourseAccess(req, COURSE_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(500);
  });

  it("returns 404 when course does not exist", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: teacherProfile });
    mockCourseMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await requireCourseAccess(req, COURSE_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(404);
  });

  it("returns 404 when caller is not a course member", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: studentProfile });
    mockCourseMaybeSingle.mockResolvedValue({ data: courseRow, error: null });
    mockLoadCourseMembership.mockResolvedValue(null);
    const result = await requireCourseAccess(req, COURSE_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(404);
  });

  it("returns ok:true with canManage:true for course owner", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: teacherProfile });
    mockCourseMaybeSingle.mockResolvedValue({ data: courseRow, error: null });
    mockLoadCourseMembership.mockResolvedValue({ canManage: true });
    const result = await requireCourseAccess(req, COURSE_ID);
    expect("ok" in result && result.ok).toBe(true);
    if ("ok" in result && result.ok) {
      expect(result.canManage).toBe(true);
      expect(result.course.id).toBe(COURSE_ID);
      expect(result.profile.id).toBe(TEACHER_ID);
    }
  });

  it("returns ok:true with canManage:false for enrolled student", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: {}, profile: studentProfile });
    mockCourseMaybeSingle.mockResolvedValue({ data: courseRow, error: null });
    mockLoadCourseMembership.mockResolvedValue({ canManage: false });
    const result = await requireCourseAccess(req, COURSE_ID);
    expect("ok" in result && result.ok).toBe(true);
    if ("ok" in result && result.ok) {
      expect(result.canManage).toBe(false);
    }
  });
});
