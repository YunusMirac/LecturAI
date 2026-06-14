import { beforeEach, describe, expect, it, vi } from "vitest";

import { isValidQuizId, requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { COURSE_ID, QUIZ_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";

const mockGetAuthenticatedProfile = vi.fn();
const mockQuizMaybeSingle = vi.fn();
const mockCourseMaybeSingle = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "quizzes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockQuizMaybeSingle,
            }),
          }),
        };
      }
      if (table === "courses") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockCourseMaybeSingle,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

describe("isValidQuizId", () => {
  it("accepts valid UUID", () => {
    expect(isValidQuizId(QUIZ_ID)).toBe(true);
  });

  it("rejects invalid ids", () => {
    expect(isValidQuizId("not-a-uuid")).toBe(false);
    expect(isValidQuizId("")).toBe(false);
  });
});

describe("requireManagedQuiz", () => {
  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockQuizMaybeSingle.mockReset();
    mockCourseMaybeSingle.mockReset();
  });

  it("rejects invalid quiz id", async () => {
    const result = await requireManagedQuiz(new Request("http://localhost"), "bad-id");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(400);
  });

  it("returns auth error when unauthenticated", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    });

    const result = await requireManagedQuiz(new Request("http://localhost"), QUIZ_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(401);
  });

  it("returns 404 when quiz missing", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockQuizMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await requireManagedQuiz(new Request("http://localhost"), QUIZ_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(404);
  });

  it("returns 403 for student", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      profile: { id: "student-id", email: "s@school.de", role: "student" },
    });
    mockQuizMaybeSingle.mockResolvedValue({
      data: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Quiz",
        status: "draft",
        settings_json: {},
        source_pdf_path: null,
        generation_error: null,
        created_by: TEACHER_ID,
        published_at: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      error: null,
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { teacher_id: TEACHER_ID },
      error: null,
    });

    const result = await requireManagedQuiz(new Request("http://localhost"), QUIZ_ID);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.status).toBe(403);
  });

  it("allows course owner teacher", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      profile: { id: TEACHER_ID, email: "t@school.de", role: "teacher" },
    });
    mockQuizMaybeSingle.mockResolvedValue({
      data: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Quiz",
        status: "draft",
        settings_json: {},
        source_pdf_path: null,
        generation_error: null,
        created_by: TEACHER_ID,
        published_at: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      error: null,
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { teacher_id: TEACHER_ID },
      error: null,
    });

    const result = await requireManagedQuiz(new Request("http://localhost"), QUIZ_ID);
    expect("ok" in result && result.ok).toBe(true);
    if ("ok" in result && result.ok) {
      expect(result.quiz.id).toBe(QUIZ_ID);
      expect(result.courseTeacherId).toBe(TEACHER_ID);
    }
  });

  it("allows admin for any course", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      profile: { id: "admin-id", email: "a@school.de", role: "admin" },
    });
    mockQuizMaybeSingle.mockResolvedValue({
      data: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Quiz",
        status: "draft",
        settings_json: {},
        source_pdf_path: null,
        generation_error: null,
        created_by: TEACHER_ID,
        published_at: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      error: null,
    });
    mockCourseMaybeSingle.mockResolvedValue({
      data: { teacher_id: TEACHER_ID },
      error: null,
    });

    const result = await requireManagedQuiz(new Request("http://localhost"), QUIZ_ID);
    expect("ok" in result && result.ok).toBe(true);
  });
});
