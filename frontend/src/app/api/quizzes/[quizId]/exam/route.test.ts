import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/quizzes/[quizId]/exam/route";
import { QUIZ_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";
import { mockChain, readJson } from "@/lib/test/route-test-helpers";

const mockRequireQuizCourseAccess = vi.fn();
const mockLoadExamResults = vi.fn();
const mockAllocateFreshAccessCode = vi.fn();
const mockAdminUpdateEq = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/require-quiz-course-access", () => ({
  requireQuizCourseAccess: (...args: unknown[]) => mockRequireQuizCourseAccess(...args),
}));

vi.mock("@/lib/server/quiz-exam", () => ({
  loadExamResults: (...args: unknown[]) => mockLoadExamResults(...args),
}));

vi.mock("@/lib/server/quiz-db", () => ({
  allocateFreshAccessCode: (...args: unknown[]) => mockAllocateFreshAccessCode(...args),
}));

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
    ...overrides,
  };
}

describe("GET /api/quizzes/[quizId]/exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockLoadExamResults.mockReset();
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
  });
});

describe("POST /api/quizzes/[quizId]/exam", () => {
  beforeEach(() => {
    mockRequireQuizCourseAccess.mockReset();
    mockAllocateFreshAccessCode.mockReset();
    mockAdminUpdateEq.mockReset();
    mockAdminFrom.mockReset();
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
    expect(status).toBe(403);
  });

  it("open generates access code and sets exam_open", async () => {
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
    expect(mockAdminFrom).toHaveBeenCalledWith("quizzes");
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
