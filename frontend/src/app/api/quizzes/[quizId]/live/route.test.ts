import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/quizzes/[quizId]/live/route";
import { QUIZ_ID } from "@/lib/server/quiz-fixtures";
import { QUESTION_SECONDS } from "@/lib/server/quiz-live";

const mockRequireManagedQuiz = vi.fn();
const mockFetchLiveQuizRow = vi.fn();
const mockBuildLiveHostState = vi.fn();
const mockGenerateAccessCode = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/require-managed-quiz", () => ({
  requireManagedQuiz: (...args: unknown[]) => mockRequireManagedQuiz(...args),
}));

vi.mock("@/lib/server/quiz-live", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/quiz-live")>();
  return {
    ...actual,
    fetchLiveQuizRow: (...args: unknown[]) => mockFetchLiveQuizRow(...args),
    buildLiveHostState: (...args: unknown[]) => mockBuildLiveHostState(...args),
  };
});

vi.mock("@/lib/server/quiz-access-code", () => ({
  generateAccessCode: (...args: unknown[]) => mockGenerateAccessCode(...args),
}));

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

function chain(resolver: () => unknown) {
  const c: Record<string, unknown> = {};
  c.eq = () => c;
  c.select = () => c;
  c.maybeSingle = () => Promise.resolve(resolver());
  c.single = () => Promise.resolve(resolver());
  c.update = () => c;
  c.delete = () => c;
  return c;
}

describe("GET /api/quizzes/[quizId]/live", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockFetchLiveQuizRow.mockReset();
    mockBuildLiveHostState.mockReset();
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

  it("returns 404 when quiz row missing", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns host state with reveal payload fields", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, live_status: "reveal" });
    mockBuildLiveHostState.mockResolvedValue({
      quiz_id: QUIZ_ID,
      live_status: "reveal",
      top_three: [{ user_id: "u1", display_email: "a@test.de", total_score: 500, rank: 1 }],
      choice_stats: [{ choice_id: "c1", text: "A", count: 3, is_correct: true }],
      all_answered_current: true,
      seconds_per_question: QUESTION_SECONDS,
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.top_three).toHaveLength(1);
    expect(body.choice_stats[0].count).toBe(3);
    expect(body.seconds_per_question).toBe(30);
  });
});

describe("POST /api/quizzes/[quizId]/live", () => {
  beforeEach(() => {
    mockRequireManagedQuiz.mockReset();
    mockFetchLiveQuizRow.mockReset();
    mockGenerateAccessCode.mockReset();
    mockAdminFrom.mockReset();
    mockGenerateAccessCode.mockReturnValue("K7M3NP");
  });

  it("rejects open when quiz not published", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "draft" } });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "open" }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(409);
  });

  it("open sets fixed 30 seconds per question", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, access_code: null });

    let capturedUpdate: Record<string, unknown> | null = null;

    mockAdminFrom.mockImplementation((table: string) => {
      const c: Record<string, unknown> = {};
      c.eq = () => c;
      c.neq = () => c;
      c.select = () => c;
      c.delete = () => c;
      c.maybeSingle = () => Promise.resolve({ data: null });
      if (table === "quizzes") {
        c.update = (payload: Record<string, unknown>) => {
          capturedUpdate = payload;
          return c;
        };
        c.then = (resolve: (v: unknown) => void) => resolve({ error: null });
      } else {
        c.then = (resolve: (v: unknown) => void) => resolve({ error: null });
      }
      return c;
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "open" }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(200);
    expect(capturedUpdate?.seconds_per_question).toBe(30);
    expect(capturedUpdate?.live_status).toBe("lobby");
    expect(capturedUpdate?.access_code).toBe("K7M3NP");
    expect(mockGenerateAccessCode).toHaveBeenCalled();
  });

  it("open generates a new code even when quiz already had one", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, access_code: "OLD123" });
    mockGenerateAccessCode.mockReturnValue("NEW456");

    let capturedUpdate: Record<string, unknown> | null = null;

    mockAdminFrom.mockImplementation((table: string) => {
      const c: Record<string, unknown> = {};
      c.eq = () => c;
      c.neq = () => c;
      c.select = () => c;
      c.delete = () => c;
      c.maybeSingle = () => Promise.resolve({ data: null });
      if (table === "quizzes") {
        c.update = (payload: Record<string, unknown>) => {
          capturedUpdate = payload;
          return c;
        };
        c.then = (resolve: (v: unknown) => void) => resolve({ error: null });
      } else {
        c.then = (resolve: (v: unknown) => void) => resolve({ error: null });
      }
      return c;
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "open" }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_code).toBe("NEW456");
    expect(capturedUpdate?.access_code).toBe("NEW456");
    expect(capturedUpdate?.access_code).not.toBe("OLD123");
  });

  it("start requires lobby status", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, live_status: "question" });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(409);
  });

  it("start requires at least one participant", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, live_status: "lobby" });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quiz_live_participants") {
        return chain(() => ({ count: 0 }));
      }
      return chain(() => ({}));
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects unknown action", async () => {
    mockRequireManagedQuiz.mockResolvedValue({ ok: true, quiz: { id: QUIZ_ID, status: "published" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ action: "pause" }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(400);
  });
});
