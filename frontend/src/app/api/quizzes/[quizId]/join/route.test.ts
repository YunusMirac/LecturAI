import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/quizzes/[quizId]/join/route";
import { COURSE_ID, QUIZ_ID, STUDENT_ID } from "@/lib/server/quiz-fixtures";
import { mockChain, readJson } from "@/lib/test/route-test-helpers";

const mockRequireQuizCourseAccess = vi.fn();
const mockStartExamAttempt = vi.fn();
const mockLoadExamAttempt = vi.fn();
const mockMaybeAutoSubmitExam = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/require-quiz-course-access", () => ({
  requireQuizCourseAccess: (...args: unknown[]) => mockRequireQuizCourseAccess(...args),
}));

vi.mock("@/lib/server/quiz-exam", () => ({
  loadExamAttempt: (...args: unknown[]) => mockLoadExamAttempt(...args),
  maybeAutoSubmitExam: (...args: unknown[]) => mockMaybeAutoSubmitExam(...args),
  startExamAttempt: (...args: unknown[]) => mockStartExamAttempt(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

const inProgressAttempt = {
  id: "att1",
  quiz_id: QUIZ_ID,
  user_id: STUDENT_ID,
  display_email: "s@test.de",
  started_at: new Date().toISOString(),
  submitted_at: null,
  submit_reason: "in_progress" as const,
  correct_count: null,
  total_count: null,
  percent_correct: null,
};

describe("GET /api/quizzes/[quizId]/join — live", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockAdminFrom.mockReset();
  });

  it("returns preview for live-open published quiz", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Live Quiz",
        status: "published",
        quiz_type: "live",
        live_open: true,
        live_status: "lobby",
      },
      profile: { id: STUDENT_ID },
    });
    mockAdminFrom.mockReturnValue(mockChain(() => ({ data: null })));

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.quiz_type).toBe("live");
    expect(body.already_joined).toBe(false);
  });

  it("rejects preview when live quiz not open for students", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Test",
        status: "published",
        quiz_type: "live",
        live_open: false,
        live_status: "closed",
      },
      profile: { id: STUDENT_ID },
    });

    const { status } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(403);
  });
});

describe("GET /api/quizzes/[quizId]/join — exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamAttempt.mockReset();
    mockMaybeAutoSubmitExam.mockReset();
    mockMaybeAutoSubmitExam.mockImplementation(async (_admin, attempt) => attempt);
  });

  it("returns exam preview with exam_open flag", async () => {
    mockLoadExamAttempt.mockResolvedValue(null);

    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Klausur",
        status: "published",
        quiz_type: "exam",
        exam_open: true,
      },
      profile: { id: STUDENT_ID },
    });

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.quiz_type).toBe("exam");
    expect(body.exam_open).toBe(true);
    expect(body.has_attempt).toBe(false);
  });

  it("allows preview when exam closed but attempt in progress", async () => {
    mockLoadExamAttempt.mockResolvedValue(inProgressAttempt);

    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Klausur",
        status: "published",
        quiz_type: "exam",
        exam_open: false,
      },
      profile: { id: STUDENT_ID },
    });

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.in_progress).toBe(true);
  });
});

describe("POST /api/quizzes/[quizId]/join — live", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockAdminFrom.mockReset();
  });

  it("rejects invalid access code format", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Test",
        status: "published",
        quiz_type: "live",
        access_code: "ABC123",
        live_open: true,
        live_status: "lobby",
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "AB" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(400);
  });

  it("rejects wrong access code", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Test",
        status: "published",
        quiz_type: "live",
        access_code: "ABC123",
        live_open: true,
        live_status: "lobby",
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "WRONG1" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(403);
  });

  it("joins live quiz with correct code", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Test",
        status: "published",
        quiz_type: "live",
        access_code: "ABC123",
        live_open: true,
        live_status: "lobby",
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });
    mockAdminFrom.mockReturnValue(mockChain(() => ({ data: null })));

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "abc123" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(body.quiz_type).toBe("live");
    expect(body.quiz_id).toBe(QUIZ_ID);
  });
});

describe("POST /api/quizzes/[quizId]/join — exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockStartExamAttempt.mockReset();
    mockLoadExamAttempt.mockReset();
    mockMaybeAutoSubmitExam.mockReset();
    mockMaybeAutoSubmitExam.mockImplementation(async (_admin, attempt) => attempt);
  });

  it("starts exam with valid code", async () => {
    mockLoadExamAttempt.mockResolvedValue(null);
    mockStartExamAttempt.mockResolvedValue({ ok: true, state: { status: "in_progress" } });

    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Klausur",
        status: "published",
        quiz_type: "exam",
        access_code: "EXAM99",
        exam_open: true,
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "exam99" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(body.quiz_type).toBe("exam");
    expect(mockStartExamAttempt).toHaveBeenCalled();
  });

  it("rejects exam join when closed", async () => {
    mockLoadExamAttempt.mockResolvedValue(null);

    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Klausur",
        status: "published",
        quiz_type: "exam",
        access_code: "EXAM99",
        exam_open: false,
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "EXAM99" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(403);
  });

  it("returns 409 when exam already submitted", async () => {
    mockLoadExamAttempt.mockResolvedValue({ ...inProgressAttempt, submit_reason: "manual" });

    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Klausur",
        status: "published",
        quiz_type: "exam",
        access_code: "EXAM99",
        exam_open: true,
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "EXAM99" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(409);
  });

  it("resumes in-progress exam without new code", async () => {
    mockLoadExamAttempt.mockResolvedValue(inProgressAttempt);

    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: {
        id: QUIZ_ID,
        title: "Klausur",
        status: "published",
        quiz_type: "exam",
        access_code: "EXAM99",
        exam_open: false,
      },
      profile: { id: STUDENT_ID, email: "s@test.de" },
    });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ access_code: "EXAM99" }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(body.detail).toContain("fortgesetzt");
    expect(mockStartExamAttempt).not.toHaveBeenCalled();
  });
});
