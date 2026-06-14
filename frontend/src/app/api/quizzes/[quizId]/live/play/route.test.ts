import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/quizzes/[quizId]/live/play/route";
import { CHOICE_ID, QUIZ_ID, QUESTION_ID } from "@/lib/server/quiz-fixtures";
import { makeQuestion } from "@/lib/server/quiz-fixtures";

const mockGetAuthenticatedProfile = vi.fn();
const mockFetchLiveQuizRow = vi.fn();
const mockBuildLivePlayState = vi.fn();
const mockLoadQuizDetail = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
  getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
}));

vi.mock("@/lib/server/quiz-live", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/quiz-live")>();
  return {
    ...actual,
    fetchLiveQuizRow: (...args: unknown[]) => mockFetchLiveQuizRow(...args),
    buildLivePlayState: (...args: unknown[]) => mockBuildLivePlayState(...args),
  };
});

vi.mock("@/lib/server/quiz-db", () => ({
  loadQuizDetail: (...args: unknown[]) => mockLoadQuizDetail(...args),
}));

function chain(resolver: () => unknown) {
  const c: Record<string, unknown> = {};
  c.eq = () => c;
  c.select = () => c;
  c.maybeSingle = () => Promise.resolve(resolver());
  c.single = () => Promise.resolve(resolver());
  c.insert = () => Promise.resolve({ error: null });
  c.update = () => c;
  return c;
}

describe("GET /api/quizzes/[quizId]/live/play", () => {
  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockFetchLiveQuizRow.mockReset();
    mockBuildLivePlayState.mockReset();
    mockAdminFrom.mockReset();
  });

  it("returns auth error", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when quiz not live", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ profile: { id: "user-1" } });
    mockFetchLiveQuizRow.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user not joined", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ profile: { id: "user-1" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, live_open: true });
    mockAdminFrom.mockReturnValue(chain(() => ({ data: null })));

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns play state with reveal stats", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ profile: { id: "user-1" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, live_open: true });
    mockAdminFrom.mockReturnValue(chain(() => ({ data: { id: "p1" } })));
    mockBuildLivePlayState.mockResolvedValue({
      quiz_id: QUIZ_ID,
      live_status: "reveal",
      top_three: [],
      choice_stats: [{ choice_id: "c1", text: "Ja", count: 5 }],
      answered_count: 5,
      all_answered_current: true,
      reveal_seconds_remaining: 4,
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ quizId: QUIZ_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live_status).toBe("reveal");
    expect(body.choice_stats).toHaveLength(1);
    expect(body.reveal_seconds_remaining).toBe(4);
  });
});

describe("POST /api/quizzes/[quizId]/live/play", () => {
  const question = makeQuestion("Frage?", [{ text: "A", is_correct: true }], {
    id: QUESTION_ID,
  });
  question.choices[0]!.id = CHOICE_ID;

  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockFetchLiveQuizRow.mockReset();
    mockLoadQuizDetail.mockReset();
    mockAdminFrom.mockReset();
  });

  it("requires choice_id", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ profile: { id: "user-1" } });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("rejects answer outside question phase", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ profile: { id: "user-1" } });
    mockFetchLiveQuizRow.mockResolvedValue({ id: QUIZ_ID, live_status: "reveal" });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ choice_id: CHOICE_ID }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(409);
  });

  it("stores answer and returns points", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ profile: { id: "user-1" } });
    mockFetchLiveQuizRow.mockResolvedValue({
      id: QUIZ_ID,
      live_status: "question",
      current_question_index: 0,
      question_started_at: new Date().toISOString(),
      seconds_per_question: 30,
    });
    mockLoadQuizDetail.mockResolvedValue({
      id: QUIZ_ID,
      questions: [question],
    });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "quiz_live_participants") {
        return chain(() => ({ data: { id: "p1" } }));
      }
      if (table === "quiz_live_answers") {
        return chain(() => ({ data: null }));
      }
      return chain(() => ({ data: { total_score: 0 } }));
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ choice_id: CHOICE_ID }),
      }),
      { params: Promise.resolve({ quizId: QUIZ_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.choice_id).toBe(CHOICE_ID);
    expect(body.points).toBeGreaterThan(0);
  });
});
