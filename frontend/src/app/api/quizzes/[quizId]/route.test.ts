import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET } from "@/app/api/quizzes/[quizId]/route";
import { QUIZ_ID } from "@/lib/server/quiz-fixtures";

const mockRequireManagedQuiz = vi.fn();
const mockLoadQuizDetail = vi.fn();
const mockDeleteEq = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/require-managed-quiz", () => ({
  requireManagedQuiz: (...args: unknown[]) => mockRequireManagedQuiz(...args),
}));

vi.mock("@/lib/server/quiz-db", () => ({
  loadQuizDetail: (...args: unknown[]) => mockLoadQuizDetail(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      mockAdminFrom(table);
      return { delete: () => ({ eq: mockDeleteEq }) };
    },
  }),
}));

describe("GET /api/quizzes/[quizId]", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockLoadQuizDetail.mockReset();
  });

  it("returns auth error", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when quiz detail missing", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID } });
    mockLoadQuizDetail.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns full quiz detail including generating status", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID } });
    mockLoadQuizDetail.mockResolvedValue({
      id: QUIZ_ID,
      status: "generating",
      questions: [],
      title: "Test",
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("generating");
    expect(body.questions).toEqual([]);
  });
});

describe("DELETE /api/quizzes/[quizId]", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockDeleteEq.mockReset();
    mockAdminFrom.mockReset();
  });

  it("returns auth error", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
    });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("deletes quiz for authorized teacher", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID } });
    mockDeleteEq.mockResolvedValue({ error: null });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.detail).toContain("gelöscht");
    expect(mockAdminFrom).toHaveBeenCalledWith("quizzes");
  });

  it("returns 500 on db error", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID } });
    mockDeleteEq.mockResolvedValue({ error: { message: "DB fail" } });

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(500);
  });
});
