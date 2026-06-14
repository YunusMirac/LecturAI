import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH, POST } from "@/app/api/quizzes/[quizId]/exam/attempt/route";
import { QUIZ_ID, STUDENT_ID } from "@/lib/server/quiz-fixtures";
import { readJson } from "@/lib/test/route-test-helpers";

const mockRequireQuizCourseAccess = vi.fn();
const mockLoadExamAttempt = vi.fn();
const mockMaybeAutoSubmitExam = vi.fn();
const mockBuildExamAttemptState = vi.fn();
const mockSaveExamAnswer = vi.fn();

vi.mock("@/lib/server/require-quiz-course-access", () => ({
  requireQuizCourseAccess: (...args: unknown[]) => mockRequireQuizCourseAccess(...args),
}));

vi.mock("@/lib/server/quiz-exam", () => ({
  loadExamAttempt: (...args: unknown[]) => mockLoadExamAttempt(...args),
  maybeAutoSubmitExam: (...args: unknown[]) => mockMaybeAutoSubmitExam(...args),
  buildExamAttemptState: (...args: unknown[]) => mockBuildExamAttemptState(...args),
  saveExamAnswer: (...args: unknown[]) => mockSaveExamAnswer(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({}),
}));

const examQuiz = { quiz_type: "exam", status: "published", title: "Klausur", exam_open: true };

describe("GET /api/quizzes/[quizId]/exam/attempt", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamAttempt.mockReset();
    mockMaybeAutoSubmitExam.mockReset();
    mockBuildExamAttemptState.mockReset();
  });

  it("returns has_attempt false when no attempt", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: examQuiz,
      profile: { id: STUDENT_ID },
    });
    mockLoadExamAttempt.mockResolvedValue(null);

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.has_attempt).toBe(false);
  });

  it("returns state when attempt exists", async () => {
    const attempt = { id: "att1", submit_reason: "in_progress", started_at: new Date().toISOString() };
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: examQuiz,
      profile: { id: STUDENT_ID },
    });
    mockLoadExamAttempt.mockResolvedValue(attempt);
    mockMaybeAutoSubmitExam.mockResolvedValue(attempt);
    mockBuildExamAttemptState.mockResolvedValue({ status: "in_progress", title: "Klausur" });

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.has_attempt).toBe(true);
    expect(body.state.status).toBe("in_progress");
  });
});

describe("POST /api/quizzes/[quizId]/exam/attempt", () => {
  it("direct start is blocked — code required via join", async () => {
    const { status, body } = await readJson(
      await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ quizId: QUIZ_ID }),
      }),
    );
    expect(status).toBe(400);
    expect(body.detail).toContain("Zugangscode");
  });
});

describe("PATCH /api/quizzes/[quizId]/exam/attempt", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamAttempt.mockReset();
    mockMaybeAutoSubmitExam.mockReset();
    mockSaveExamAnswer.mockReset();
    mockBuildExamAttemptState.mockReset();
  });

  it("saves answer for in-progress attempt", async () => {
    const attempt = { id: "att1", submit_reason: "in_progress" };
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      quiz: examQuiz,
      profile: { id: STUDENT_ID },
    });
    mockLoadExamAttempt.mockResolvedValue(attempt);
    mockMaybeAutoSubmitExam.mockResolvedValue(attempt);
    mockSaveExamAnswer.mockResolvedValue({ ok: true });
    mockBuildExamAttemptState.mockResolvedValue({ status: "in_progress" });

    const { status } = await readJson(
      await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ question_id: "q1", choice_id: "c1" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(mockSaveExamAnswer).toHaveBeenCalled();
  });

  it("returns 404 when attempt missing", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      quiz: examQuiz,
      profile: { id: STUDENT_ID },
    });
    mockLoadExamAttempt.mockResolvedValue(null);

    const { status } = await readJson(
      await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ question_id: "q1", choice_id: "c1" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(404);
  });
});
