import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/quizzes/[quizId]/questions/[questionId]/choices/[choiceId]/route";
import { CHOICE_ID, QUESTION_ID, QUIZ_ID } from "@/lib/server/quiz-fixtures";

const mockRequireManagedQuiz = vi.fn();
const mockChoiceQuestionId = vi.fn();
const mockQuestionMaybeSingle = vi.fn();
const mockChoiceCount = vi.fn();
const mockChoiceUpdateEq = vi.fn();
const mockChoiceUpdateMaybeSingle = vi.fn();
const mockChoiceDeleteEq = vi.fn();

vi.mock("@/lib/server/require-managed-quiz", () => ({
  requireManagedQuiz: (...args: unknown[]) => mockRequireManagedQuiz(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "quiz_choices") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return { eq: mockChoiceCount };
            }
            return {
              eq: () => ({
                maybeSingle: mockChoiceQuestionId,
              }),
            };
          },
          update: () => ({
            eq: (col: string) => {
              if (col === "question_id") {
                return { neq: mockChoiceUpdateEq };
              }
              return {
                select: () => ({
                  maybeSingle: mockChoiceUpdateMaybeSingle,
                }),
              };
            },
          }),
          delete: () => ({
            eq: () => ({
              select: mockChoiceDeleteEq,
            }),
          }),
        };
      }
      if (table === "quiz_questions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mockQuestionMaybeSingle,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const routeCtx = {
  params: Promise.resolve({
    quizId: QUIZ_ID,
    questionId: QUESTION_ID,
    choiceId: CHOICE_ID,
  }),
};

describe("PATCH choice", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockChoiceQuestionId.mockReset();
    mockQuestionMaybeSingle.mockReset();
    mockChoiceUpdateEq.mockReset();
    mockChoiceUpdateMaybeSingle.mockReset();
  });

  it("updates choice text", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockChoiceQuestionId.mockResolvedValue({ data: { question_id: QUESTION_ID } });
    mockQuestionMaybeSingle.mockResolvedValue({ data: { id: QUESTION_ID } });
    mockChoiceUpdateMaybeSingle.mockResolvedValue({
      data: { id: CHOICE_ID, text: "Geändert", is_correct: false },
      error: null,
    });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ text: "  Geändert  " }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("Geändert");
  });

  it("returns 404 when choice belongs to different question", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockChoiceQuestionId.mockResolvedValue({ data: { question_id: "other-q" } });

    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ text: "X" }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE choice", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockChoiceQuestionId.mockReset();
    mockChoiceCount.mockReset();
    mockChoiceDeleteEq.mockReset();
  });

  it("prevents deleting below minimum choices", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockChoiceQuestionId.mockResolvedValue({ data: { question_id: QUESTION_ID } });
    mockChoiceCount.mockResolvedValue({ count: 2 });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("deletes choice when more than two remain", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockChoiceQuestionId.mockResolvedValue({ data: { question_id: QUESTION_ID } });
    mockChoiceCount.mockResolvedValue({ count: 4 });
    mockChoiceDeleteEq.mockResolvedValue({ data: [{ id: CHOICE_ID }], error: null });

    const res = await DELETE(new Request("http://localhost", { method: "DELETE" }), routeCtx);
    expect(res.status).toBe(200);
  });
});
