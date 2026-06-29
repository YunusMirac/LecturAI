import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/quizzes/[quizId]/exam/results/route";
import { GET as GET_DETAIL } from "@/app/api/quizzes/[quizId]/exam/results/[userId]/route";
import { QUIZ_ID, STUDENT_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";
import { readJson } from "@/lib/test/route-test-helpers";

const mockRequireQuizCourseAccess = vi.fn();
const mockLoadExamResults = vi.fn();
const mockLoadExamResultDetail = vi.fn();

vi.mock("@/lib/server/require-quiz-course-access", () => ({
  requireQuizCourseAccess: (...args: unknown[]) => mockRequireQuizCourseAccess(...args),
}));

vi.mock("@/lib/server/quiz-exam", () => ({
  loadExamResults: (...args: unknown[]) => mockLoadExamResults(...args),
  loadExamResultDetail: (...args: unknown[]) => mockLoadExamResultDetail(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({}),
}));

describe("GET /api/quizzes/[quizId]/exam/results", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamResults.mockReset();
  });

  it("returns 403 for students", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: { quiz_type: "exam", title: "Klausur" },
    });

    const { status } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(404);
  });

  it("returns results for teacher", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: { quiz_type: "exam", title: "Klausur" },
    });
    mockLoadExamResults.mockResolvedValue([
      { display_email: "s@test.de", percent_correct: 80, in_progress: false },
    ]);

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.title).toBe("Klausur");
  });
});

describe("GET /api/quizzes/[quizId]/exam/results/[userId]", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamResultDetail.mockReset();
  });

  it("returns per-student detail for teacher", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: { quiz_type: "exam" },
    });
    mockLoadExamResultDetail.mockResolvedValue({
      display_email: "s@test.de",
      percent_correct: 75,
      questions: [],
    });

    const { status, body } = await readJson(
      await GET_DETAIL(new Request("http://localhost"), {
        params: Promise.resolve({ quizId: QUIZ_ID, userId: STUDENT_ID }),
      }),
    );
    expect(status).toBe(200);
    expect(body.display_email).toBe("s@test.de");
  });

  it("returns 404 when no submission", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: { quiz_type: "exam" },
    });
    mockLoadExamResultDetail.mockResolvedValue(null);

    const { status } = await readJson(
      await GET_DETAIL(new Request("http://localhost"), {
        params: Promise.resolve({ quizId: QUIZ_ID, userId: TEACHER_ID }),
      }),
    );
    expect(status).toBe(404);
  });
});
