import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/quizzes/[quizId]/questions/[questionId]/route";
import { QUIZ_ID, QUESTION_ID } from "@/lib/server/quiz-fixtures";

const mockRequireManagedQuiz = vi.fn();
const mockUpdateMaybeSingle = vi.fn();
const mockDeleteSelect = vi.fn();

vi.mock("@/lib/server/require-managed-quiz", () => ({
  requireManagedQuiz: (...args: unknown[]) => mockRequireManagedQuiz(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "quiz_questions") throw new Error(`unexpected table ${table}`);
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: mockUpdateMaybeSingle,
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              select: mockDeleteSelect,
            }),
          }),
        }),
      };
    },
  }),
}));

const routeCtx = {
  params: Promise.resolve({ quizId: QUIZ_ID, questionId: QUESTION_ID }),
};

describe("PATCH /api/quizzes/[quizId]/questions/[questionId]", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockUpdateMaybeSingle.mockReset();
  });

  it("blocks editing published quiz", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "published" },
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ prompt: "Neu" }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(409);
  });

  it("updates prompt for draft quiz", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockUpdateMaybeSingle.mockResolvedValue({
      data: { id: QUESTION_ID, prompt: "Neu", sort_order: 0 },
      error: null,
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ prompt: "  Neu  " }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prompt).toBe("Neu");
  });

  it("returns 404 when question not found", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockUpdateMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ prompt: "Neu" }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/quizzes/[quizId]/questions/[questionId]", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockDeleteSelect.mockReset();
  });

  it("deletes question from draft quiz", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockDeleteSelect.mockResolvedValue({ data: [{ id: QUESTION_ID }], error: null });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), routeCtx);
    expect(res.status).toBe(200);
  });

  it("returns 404 when question missing", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockDeleteSelect.mockResolvedValue({ data: [], error: null });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), routeCtx);
    expect(res.status).toBe(404);
  });
});
