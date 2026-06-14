import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/quizzes/[quizId]/exam/submit/route";
import { QUIZ_ID, STUDENT_ID } from "@/lib/server/quiz-fixtures";
import { readJson } from "@/lib/test/route-test-helpers";

const mockRequireQuizCourseAccess = vi.fn();
const mockLoadExamAttempt = vi.fn();
const mockMaybeAutoSubmitExam = vi.fn();
const mockFinalizeExamAttempt = vi.fn();

vi.mock("@/lib/server/require-quiz-course-access", () => ({
  requireQuizCourseAccess: (...args: unknown[]) => mockRequireQuizCourseAccess(...args),
}));

vi.mock("@/lib/server/quiz-exam", () => ({
  loadExamAttempt: (...args: unknown[]) => mockLoadExamAttempt(...args),
  maybeAutoSubmitExam: (...args: unknown[]) => mockMaybeAutoSubmitExam(...args),
  finalizeExamAttempt: (...args: unknown[]) => mockFinalizeExamAttempt(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({}),
}));

describe("POST /api/quizzes/[quizId]/exam/submit", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamAttempt.mockReset();
    mockMaybeAutoSubmitExam.mockReset();
    mockFinalizeExamAttempt.mockReset();
  });

  it("returns 404 when no attempt", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      quiz: { quiz_type: "exam", status: "published" },
      profile: { id: STUDENT_ID },
    });
    mockLoadExamAttempt.mockResolvedValue(null);

    const { status } = await readJson(
      await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ quizId: QUIZ_ID }),
      }),
    );
    expect(status).toBe(404);
  });

  it("finalizes in-progress attempt", async () => {
    const attempt = { id: "att1", submit_reason: "in_progress" };
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      quiz: { quiz_type: "exam", status: "published" },
      profile: { id: STUDENT_ID },
    });
    mockLoadExamAttempt.mockResolvedValue(attempt);
    mockMaybeAutoSubmitExam.mockResolvedValue(attempt);
    mockFinalizeExamAttempt.mockResolvedValue({
      ok: true,
      state: { status: "submitted", title: "Klausur" },
    });

    const { status, body } = await readJson(
      await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ quizId: QUIZ_ID }),
      }),
    );
    expect(status).toBe(200);
    expect(body.state.status).toBe("submitted");
  });

  it("rejects non-exam quiz", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      quiz: { quiz_type: "live", status: "published" },
      profile: { id: STUDENT_ID },
    });

    const { status } = await readJson(
      await POST(new Request("http://localhost", { method: "POST" }), {
        params: Promise.resolve({ quizId: QUIZ_ID }),
      }),
    );
    expect(status).toBe(400);
  });
});
