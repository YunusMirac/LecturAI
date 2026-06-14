import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/quizzes/[quizId]/publish/route";

const QUIZ_ID = "44444444-4444-4444-8444-444444444444";

const mockRequireManagedQuiz = vi.fn();
const mockLoadQuizDetail = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock("@/lib/server/require-managed-quiz", () => ({
  requireManagedQuiz: (...args: unknown[]) => mockRequireManagedQuiz(...args),
}));

vi.mock("@/lib/server/quiz-db", () => ({
  loadQuizDetail: (...args: unknown[]) => mockLoadQuizDetail(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "quizzes") throw new Error(`unexpected table ${table}`);
      return {
        update: () => ({
          eq: mockUpdateEq,
        }),
      };
    },
  }),
}));

describe("POST /api/quizzes/[quizId]/publish", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockLoadQuizDetail.mockReset();
    mockUpdateEq.mockReset();
  });

  it("returns auth error from requireManagedQuiz", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
    });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects publish while generating", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "generating", course_id: "c1" },
    });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(409);
  });

  it("publishes draft quiz with valid questions", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft", course_id: "c1" },
    });
    mockLoadQuizDetail.mockResolvedValue({
      id: QUIZ_ID,
      status: "draft",
      questions: [
        {
          id: "q1",
          prompt: "Frage?",
          sort_order: 0,
          choices: [
            { id: "c1", text: "Ja", is_correct: true, sort_order: 0 },
            { id: "c2", text: "Nein", is_correct: false, sort_order: 1 },
          ],
        },
      ],
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("published");
  });

  it("rejects publish without questions", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft", course_id: "c1" },
    });
    mockLoadQuizDetail.mockResolvedValue({
      id: QUIZ_ID,
      status: "draft",
      questions: [],
    });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects publish when quiz generation failed", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "failed", course_id: "c1" },
    });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(409);
  });

  it("rejects publish when already published", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "published", course_id: "c1" },
    });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(409);
  });

  it("rejects publish when question has no correct answer", async () => {
    mockRequireManagedQuiz.mockResolvedValue({
      ok: true,
      quiz: { id: QUIZ_ID, status: "draft", course_id: "c1" },
    });
    mockLoadQuizDetail.mockResolvedValue({
      id: QUIZ_ID,
      status: "draft",
      questions: [
        {
          id: "q1",
          prompt: "Frage?",
          sort_order: 0,
          choices: [
            { id: "c1", text: "A", is_correct: false, sort_order: 0 },
            { id: "c2", text: "B", is_correct: false, sort_order: 1 },
          ],
        },
      ],
    });

    const res = await POST(new Request("http://localhost/api/quizzes/x", { method: "POST" }), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(400);
  });
});
