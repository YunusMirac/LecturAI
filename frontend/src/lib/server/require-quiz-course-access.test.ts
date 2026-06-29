import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { COURSE_ID, QUIZ_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";

const mockRequireCourseAccess = vi.fn();
const mockQuizMaybeSingle = vi.fn();

vi.mock("@/lib/server/require-course-access", () => ({
  requireCourseAccess: (...args: unknown[]) => mockRequireCourseAccess(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockQuizMaybeSingle,
        }),
      }),
    }),
  }),
}));

const teacherProfile = { id: TEACHER_ID, email: "t@school.de", role: "teacher" as const };

const quizRow = {
  id: QUIZ_ID,
  course_id: COURSE_ID,
  title: "Statistik Quiz",
  status: "published",
  settings_json: {},
  exam_config_json: null,
  source_pdf_path: null,
  generation_error: null,
  created_by: TEACHER_ID,
  published_at: "2026-01-01",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  access_code: "ABC123",
  live_open: false,
  live_status: "idle",
  quiz_type: "live",
  exam_open: false,
};

describe("requireQuizCourseAccess", () => {
  const req = new Request("http://localhost/api/quizzes/" + QUIZ_ID);

  beforeEach(() => {
    mockQuizMaybeSingle.mockReset();
    mockRequireCourseAccess.mockReset();
  });

  it("returns 400 for invalid quiz ID", async () => {
    const result = await requireQuizCourseAccess(req, "not-a-uuid");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(400);
  });

  it("returns 404 when quiz does not exist", async () => {
    mockQuizMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await requireQuizCourseAccess(req, QUIZ_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(404);
  });

  it("returns 500 when quiz DB query errors", async () => {
    mockQuizMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    });
    const result = await requireQuizCourseAccess(req, QUIZ_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(500);
  });

  it("passes through course access error", async () => {
    mockQuizMaybeSingle.mockResolvedValue({ data: quizRow, error: null });
    mockRequireCourseAccess.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const result = await requireQuizCourseAccess(req, QUIZ_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(403);
  });

  it("returns ok:true when quiz and course are accessible", async () => {
    mockQuizMaybeSingle.mockResolvedValue({ data: quizRow, error: null });
    mockRequireCourseAccess.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs", semester: null },
      profile: teacherProfile,
      canManage: true,
    });
    const result = await requireQuizCourseAccess(req, QUIZ_ID);
    expect("ok" in result && result.ok).toBe(true);
    if ("ok" in result && result.ok) {
      expect(result.quiz.id).toBe(QUIZ_ID);
      expect(result.canManage).toBe(true);
      expect(result.profile.id).toBe(TEACHER_ID);
    }
  });

  it("returns canManage:false for enrolled student", async () => {
    const studentProfile = { id: "student-id", email: "s@school.de", role: "student" as const };
    mockQuizMaybeSingle.mockResolvedValue({ data: quizRow, error: null });
    mockRequireCourseAccess.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, teacher_id: TEACHER_ID, name: "Kurs", semester: null },
      profile: studentProfile,
      canManage: false,
    });
    const result = await requireQuizCourseAccess(req, QUIZ_ID);
    expect("ok" in result && result.ok).toBe(true);
    if ("ok" in result && result.ok) {
      expect(result.canManage).toBe(false);
    }
  });
});
