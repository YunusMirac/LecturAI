import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, PATCH, POST } from "@/app/api/quizzes/[quizId]/exam/route";
import {
  baseExamConfig,
  makePoolQuestions,
  poolSettings,
  QUIZ_ID,
  TEACHER_ID,
} from "@/lib/server/quiz-fixtures";
import { readJson } from "@/lib/test/route-test-helpers";

const mockRequireQuizCourseAccess = vi.fn();
const mockLoadExamResults = vi.fn();
const mockAllocateFreshAccessCode = vi.fn();
const mockLoadQuizDetail = vi.fn();
const mockCountExamAttempts = vi.fn();
const mockAdminUpdateEq = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/require-quiz-course-access", () => ({
  requireQuizCourseAccess: (...args: unknown[]) => mockRequireQuizCourseAccess(...args),
}));

vi.mock("@/lib/server/quiz-exam", () => ({
  loadExamResults: (...args: unknown[]) => mockLoadExamResults(...args),
}));

vi.mock("@/lib/server/quiz-db", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/server/quiz-db")>();
  return {
    ...orig,
    allocateFreshAccessCode: (...args: unknown[]) => mockAllocateFreshAccessCode(...args),
    loadQuizDetail: (...args: unknown[]) => mockLoadQuizDetail(...args),
    countExamAttempts: (...args: unknown[]) => mockCountExamAttempts(...args),
  };
});

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      mockAdminFrom(table);
      return {
        update: () => ({ eq: mockAdminUpdateEq }),
      };
    },
  }),
}));

function examQuiz(overrides: Record<string, unknown> = {}) {
  return {
    quiz_type: "exam",
    title: "Klausur 1",
    status: "published",
    exam_open: false,
    access_code: null,
    exam_config_json: null,
    ...overrides,
  };
}

function legacyDetail() {
  return {
    settings_json: { question_count: 5, choice_count: 4, difficulty: "medium" },
    exam_config_json: null,
    questions: makePoolQuestions({ easy: 0, medium: 5, hard: 0 }),
  };
}

function poolDetail() {
  return {
    settings_json: poolSettings,
    exam_config_json: baseExamConfig,
    questions: makePoolQuestions({ easy: 2, medium: 2, hard: 1 }),
  };
}

describe("GET /api/quizzes/[quizId]/exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamResults.mockReset();
    mockLoadQuizDetail.mockReset();
    mockLoadQuizDetail.mockResolvedValue(legacyDetail());
  });

  it("returns 400 for non-exam quiz", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: { quiz_type: "live", title: "Live" },
    });

    const { status } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(400);
  });

  it("returns meta and results for teacher", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz({ access_code: "CODE12", exam_open: true }),
    });
    mockLoadExamResults.mockResolvedValue([{ attempt_id: "a1", display_email: "s@test.de" }]);

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), { params: Promise.resolve({ quizId: QUIZ_ID }) }),
    );
    expect(status).toBe(200);
    expect(body.access_code).toBe("CODE12");
    expect(body.results).toHaveLength(1);
    expect(body.pool_counts).toEqual({ easy: 0, medium: 5, hard: 0 });
  });
});

describe("PATCH /api/quizzes/[quizId]/exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadQuizDetail.mockReset();
    mockCountExamAttempts.mockReset();
    mockAdminUpdateEq.mockReset();
    mockLoadQuizDetail.mockResolvedValue(poolDetail());
    mockCountExamAttempts.mockResolvedValue(0);
    mockAdminUpdateEq.mockResolvedValue({ error: null });
  });

  it("returns 403 for students", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: examQuiz(),
    });

    const { status } = await readJson(
      await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ duration_minutes: 60, draw_easy: 1, draw_medium: 1, draw_hard: 1 }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(404);
  });

  it("saves valid exam config", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz(),
    });

    const { status, body } = await readJson(
      await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ duration_minutes: 60, draw_easy: 1, draw_medium: 1, draw_hard: 1 }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(body.exam_config.draw_counts).toEqual({ easy: 1, medium: 1, hard: 1 });
  });

  it("returns 400 when draw exceeds pool", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz(),
    });

    const { status } = await readJson(
      await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ duration_minutes: 60, draw_easy: 5, draw_medium: 0, draw_hard: 0 }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(400);
  });

  it("returns 409 when exam is open", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz({ exam_open: true }),
    });

    const { status } = await readJson(
      await PATCH(
        new Request("http://localhost", {
          method: "PATCH",
          body: JSON.stringify({ duration_minutes: 60, draw_easy: 1, draw_medium: 0, draw_hard: 0 }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(409);
  });
});

describe("POST /api/quizzes/[quizId]/exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockAllocateFreshAccessCode.mockReset();
    mockAdminUpdateEq.mockReset();
    mockAdminFrom.mockReset();
    mockLoadQuizDetail.mockReset();
    mockLoadQuizDetail.mockResolvedValue(legacyDetail());
  });

  it("returns 403 for students", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: false,
      quiz: examQuiz(),
      profile: { id: TEACHER_ID },
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "open" }) }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(404);
  });

  it("open generates access code and sets exam_open for legacy exam", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz(),
    });
    mockAllocateFreshAccessCode.mockResolvedValue("NEWCODE");
    mockAdminUpdateEq.mockResolvedValue({ error: null });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "open" }) }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(body.exam_open).toBe(true);
    expect(body.access_code).toBe("NEWCODE");
  });

  it("returns 409 for pool exam without config", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz(),
    });
    mockLoadQuizDetail.mockResolvedValue({
      settings_json: poolSettings,
      exam_config_json: null,
      questions: makePoolQuestions({ easy: 2, medium: 2, hard: 1 }),
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "open" }) }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(409);
  });

  it("close clears exam_open and access_code", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz({ exam_open: true, access_code: "OLD123" }),
    });
    mockAdminUpdateEq.mockResolvedValue({ error: null });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "close" }) }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(200);
    expect(body.exam_open).toBe(false);
  });

  it("returns 409 when not published", async () => {
    mockRequireQuizCourseAccess.mockResolvedValue({
      ok: true,
      canManage: true,
      quiz: examQuiz({ status: "draft" }),
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ action: "open" }) }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(409);
  });
});
