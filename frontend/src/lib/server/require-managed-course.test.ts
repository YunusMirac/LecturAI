import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireManagedCourse } from "@/lib/server/require-managed-course";
import { COURSE_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";

const mockRequireCourseAccess = vi.fn();

vi.mock("@/lib/server/require-course-access", () => ({
  requireCourseAccess: (...args: unknown[]) => mockRequireCourseAccess(...args),
}));

const courseRow = {
  id: COURSE_ID,
  teacher_id: TEACHER_ID,
  name: "Informatik 1",
  semester: "WS 2025",
  created_at: "2026-01-01",
};
const teacherProfile = { id: TEACHER_ID, email: "t@school.de", role: "teacher" as const };

describe("requireManagedCourse", () => {
  const req = new Request("http://localhost/api/courses/" + COURSE_ID);

  beforeEach(() => {
    mockRequireCourseAccess.mockReset();
  });

  it("passes through errors from requireCourseAccess", async () => {
    const errorResponse = new Response(null, { status: 401 });
    mockRequireCourseAccess.mockResolvedValue({ error: errorResponse });
    const result = await requireManagedCourse(req, COURSE_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(401);
  });

  it("returns 404 when caller can access but cannot manage the course", async () => {
    mockRequireCourseAccess.mockResolvedValue({
      ok: true,
      course: courseRow,
      profile: teacherProfile,
      canManage: false,
    });
    const result = await requireManagedCourse(req, COURSE_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(404);
  });

  it("returns ok:true when caller can manage the course", async () => {
    mockRequireCourseAccess.mockResolvedValue({
      ok: true,
      course: courseRow,
      profile: teacherProfile,
      canManage: true,
    });
    const result = await requireManagedCourse(req, COURSE_ID);
    expect("ok" in result && result.ok).toBe(true);
    if ("ok" in result && result.ok) {
      expect(result.course.id).toBe(COURSE_ID);
      expect(result.profile.id).toBe(TEACHER_ID);
    }
  });

  it("passes the request and courseId to requireCourseAccess", async () => {
    mockRequireCourseAccess.mockResolvedValue({ error: new Response(null, { status: 400 }) });
    await requireManagedCourse(req, COURSE_ID);
    expect(mockRequireCourseAccess).toHaveBeenCalledWith(req, COURSE_ID);
  });
});
