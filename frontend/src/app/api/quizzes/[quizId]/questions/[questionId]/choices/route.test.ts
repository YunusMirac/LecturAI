import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/quizzes/[quizId]/questions/[questionId]/choices/route";
import { CHOICE_ID, QUESTION_ID, QUIZ_ID } from "@/lib/server/quiz-fixtures";

const mockRequireManagedQuiz = vi.fn();
const mockQuestionMaybeSingle = vi.fn();
const mockChoiceCount = vi.fn();
const mockMaxOrderMaybeSingle = vi.fn();
const mockChoiceUpdateEq = vi.fn();
const mockChoiceInsertSingle = vi.fn();

vi.mock("@/lib/server/require-managed-quiz", () => ({
  requireManagedQuiz: (...args: unknown[]) => mockRequireManagedQuiz(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
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
      if (table === "quiz_choices") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return { eq: mockChoiceCount };
            }
            return {
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: mockMaxOrderMaybeSingle,
                  }),
                }),
              }),
            };
          },
          update: () => ({ eq: mockChoiceUpdateEq }),
          insert: () => ({
            select: () => ({
              single: mockChoiceInsertSingle,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

const routeCtx = {
  params: Promise.resolve({ quizId: QUIZ_ID, questionId: QUESTION_ID }),
};

describe("POST /api/quizzes/[quizId]/questions/[questionId]/choices", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockQuestionMaybeSingle.mockReset();
    mockChoiceCount.mockReset();
    mockMaxOrderMaybeSingle.mockReset();
    mockChoiceUpdateEq.mockReset();
    mockChoiceInsertSingle.mockReset();
  });

  it("blocks adding to published quiz", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "published" },
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ text: "Neu", is_correct: false }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(409);
  });

  it("rejects when max choices reached", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockQuestionMaybeSingle.mockResolvedValue({ data: { id: QUESTION_ID } });
    mockChoiceCount.mockResolvedValue({ count: 6 });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ text: "Neu", is_correct: false }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  it("inserts choice and clears other correct flags when marked correct", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockQuestionMaybeSingle.mockResolvedValue({ data: { id: QUESTION_ID } });
    mockChoiceCount.mockResolvedValue({ count: 3 });
    mockMaxOrderMaybeSingle.mockResolvedValue({ data: { sort_order: 2 } });
    mockChoiceUpdateEq.mockResolvedValue({ error: null });
    mockChoiceInsertSingle.mockResolvedValue({
      data: {
        id: CHOICE_ID,
        question_id: QUESTION_ID,
        text: "Neu",
        is_correct: true,
        sort_order: 3,
      },
      error: null,
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ text: "Neu", is_correct: true }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(201);
    expect(mockChoiceUpdateEq).toHaveBeenCalled();
  });
});
