import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/quizzes/[quizId]/questions/route";
import { QUIZ_ID, QUESTION_ID } from "@/lib/server/quiz-fixtures";

const mockRequireManagedQuiz = vi.fn();
const mockMaxOrderMaybeSingle = vi.fn();
const mockQuestionInsertSingle = vi.fn();
const mockChoiceInsertSelect = vi.fn();
const mockQuestionDeleteEq = vi.fn();

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
              order: () => ({
                limit: () => ({
                  maybeSingle: mockMaxOrderMaybeSingle,
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: mockQuestionInsertSingle,
            }),
          }),
          delete: () => ({ eq: mockQuestionDeleteEq }),
        };
      }
      if (table === "quiz_choices") {
        return {
          insert: () => ({
            select: mockChoiceInsertSelect,
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

describe("POST /api/quizzes/[quizId]/questions", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockMaxOrderMaybeSingle.mockReset();
    mockQuestionInsertSingle.mockReset();
    mockChoiceInsertSelect.mockReset();
    mockQuestionDeleteEq.mockReset();
  });

  it("rejects while quiz is generating", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "generating" },
    });

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({
            prompt: "Neue Frage?",
            choices: [
              { text: "A", is_correct: true },
              { text: "B", is_correct: false },
            ],
          }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(409);
  });

  it("rejects empty prompt", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({
            prompt: "  ",
            choices: [
              { text: "A", is_correct: true },
              { text: "B", is_correct: false },
            ],
          }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(400);
    expect(body.prompt).toBeDefined();
  });

  it("rejects when not exactly one correct choice", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({
            prompt: "Frage?",
            choices: [
              { text: "A", is_correct: false },
              { text: "B", is_correct: false },
            ],
          }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(400);
    expect(body.choices).toBeDefined();
  });

  it("creates question with choices", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft" },
    });
    mockMaxOrderMaybeSingle.mockResolvedValue({ data: { sort_order: 2 } });
    mockQuestionInsertSingle.mockResolvedValue({
      data: {
        id: QUESTION_ID,
        quiz_id: QUIZ_ID,
        prompt: "Frage?",
        sort_order: 3,
        created_at: "2026-01-01",
      },
      error: null,
    });
    mockChoiceInsertSelect.mockResolvedValue({
      data: [
        { id: "c1", question_id: QUESTION_ID, text: "A", is_correct: true, sort_order: 0 },
        { id: "c2", question_id: QUESTION_ID, text: "B", is_correct: false, sort_order: 1 },
      ],
      error: null,
    });

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({
            prompt: "Frage?",
            choices: [
              { text: "A", is_correct: true },
              { text: "B", is_correct: false },
            ],
          }),
        }),
        { params: Promise.resolve({ quizId: QUIZ_ID }) },
      ),
    );
    expect(status).toBe(201);
    expect(body.id).toBe(QUESTION_ID);
    expect(body.choices).toHaveLength(2);
  });
});
