import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  generateAccessCode,
  isValidAccessCodeFormat,
  normalizeAccessCode,
} from "@/lib/server/quiz-access-code";
import {
  buildChoiceStats,
  computePoints,
  computeRevealDurationSeconds,
  computeSecondsRemaining,
  getTopThree,
  maybeAdvanceLiveQuiz,
  QUESTION_SECONDS,
  REVEAL_SECONDS_FAST,
  REVEAL_SECONDS_SLOW,
} from "@/lib/server/quiz-live";
import type { LiveLeaderboardEntry, LiveQuizRow } from "@/lib/server/quiz-live-types";
import { makeQuestion, QUIZ_ID } from "@/lib/server/quiz-fixtures";

describe("normalizeAccessCode", () => {
  it("uppercases and strips invalid chars", () => {
    expect(normalizeAccessCode(" ab-c123 ")).toBe("ABC123");
  });
});

describe("isValidAccessCodeFormat", () => {
  it("accepts 4-8 alphanumeric codes", () => {
    expect(isValidAccessCodeFormat("ABC1")).toBe(true);
    expect(isValidAccessCodeFormat("ABCD1234")).toBe(true);
  });

  it("rejects too short or long", () => {
    expect(isValidAccessCodeFormat("AB")).toBe(false);
    expect(isValidAccessCodeFormat("ABCDEFGHI")).toBe(false);
  });
});

describe("generateAccessCode", () => {
  it("generates code of requested length", () => {
    const code = generateAccessCode(6);
    expect(code).toHaveLength(6);
    expect(isValidAccessCodeFormat(code)).toBe(true);
  });
});

describe("QUESTION_SECONDS", () => {
  it("is fixed at 30 seconds", () => {
    expect(QUESTION_SECONDS).toBe(30);
  });

  it("is longer than fast reveal duration", () => {
    expect(QUESTION_SECONDS).toBeGreaterThan(REVEAL_SECONDS_FAST);
  });
});

describe("reveal duration constants", () => {
  it("uses fast reveal when everyone answered", () => {
    expect(REVEAL_SECONDS_FAST).toBe(5);
  });

  it("uses slow reveal on timeout", () => {
    expect(REVEAL_SECONDS_SLOW).toBe(8);
  });

  it("slow reveal is longer than fast reveal", () => {
    expect(REVEAL_SECONDS_SLOW).toBeGreaterThan(REVEAL_SECONDS_FAST);
  });
});

describe("computeRevealDurationSeconds", () => {
  it("returns fast duration when all answered", () => {
    expect(computeRevealDurationSeconds(true)).toBe(REVEAL_SECONDS_FAST);
  });

  it("returns slow duration on timeout", () => {
    expect(computeRevealDurationSeconds(false)).toBe(REVEAL_SECONDS_SLOW);
  });

  it("only has two possible values", () => {
    expect([REVEAL_SECONDS_FAST, REVEAL_SECONDS_SLOW]).toContain(
      computeRevealDurationSeconds(true),
    );
    expect([REVEAL_SECONDS_FAST, REVEAL_SECONDS_SLOW]).toContain(
      computeRevealDurationSeconds(false),
    );
  });
});

describe("computeSecondsRemaining", () => {
  it("counts down from start time", () => {
    const started = new Date("2026-01-01T12:00:00Z").toISOString();
    const now = new Date("2026-01-01T12:00:15Z").getTime();
    expect(computeSecondsRemaining(started, 30, now)).toBe(15);
  });

  it("never goes below zero", () => {
    const started = new Date("2026-01-01T12:00:00Z").toISOString();
    const now = new Date("2026-01-01T12:01:00Z").getTime();
    expect(computeSecondsRemaining(started, 30, now)).toBe(0);
  });

  it("returns null without start time", () => {
    expect(computeSecondsRemaining(null, 30)).toBeNull();
  });

  it("uses QUESTION_SECONDS as default duration in point calc context", () => {
    const started = new Date("2026-01-01T12:00:00Z").toISOString();
    const now = new Date("2026-01-01T12:00:00Z").getTime();
    expect(computeSecondsRemaining(started, QUESTION_SECONDS, now)).toBe(QUESTION_SECONDS);
  });
});

describe("computePoints", () => {
  it("gives zero for wrong answers", () => {
    const pts = computePoints(
      false,
      new Date("2026-01-01T12:00:05Z"),
      "2026-01-01T12:00:00Z",
      30,
    );
    expect(pts).toBe(0);
  });

  it("gives more points for faster correct answers", () => {
    const fast = computePoints(
      true,
      new Date("2026-01-01T12:00:02Z"),
      "2026-01-01T12:00:00Z",
      30,
    );
    const slow = computePoints(
      true,
      new Date("2026-01-01T12:00:25Z"),
      "2026-01-01T12:00:00Z",
      30,
    );
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeLessThanOrEqual(1000);
    expect(slow).toBeGreaterThanOrEqual(500);
  });

  it("defaults to QUESTION_SECONDS when duration omitted", () => {
    const pts = computePoints(
      true,
      new Date("2026-01-01T12:00:00Z"),
      "2026-01-01T12:00:00Z",
    );
    expect(pts).toBe(1000);
  });
});

describe("getTopThree", () => {
  const board: LiveLeaderboardEntry[] = [
    { user_id: "1", display_email: "a@test.de", total_score: 900, rank: 1 },
    { user_id: "2", display_email: "b@test.de", total_score: 700, rank: 2 },
    { user_id: "3", display_email: "c@test.de", total_score: 500, rank: 3 },
    { user_id: "4", display_email: "d@test.de", total_score: 200, rank: 4 },
  ];

  it("returns at most three entries", () => {
    expect(getTopThree(board)).toHaveLength(3);
  });

  it("preserves leaderboard order", () => {
    expect(getTopThree(board).map((e) => e.user_id)).toEqual(["1", "2", "3"]);
  });

  it("handles empty leaderboard", () => {
    expect(getTopThree([])).toEqual([]);
  });

  it("handles fewer than three players", () => {
    expect(getTopThree(board.slice(0, 2))).toHaveLength(2);
  });
});

type MockAdminConfig = {
  questionIds?: string[];
  answerCount?: number;
  updateRow?: Partial<LiveQuizRow>;
};

function makeLiveQuizRow(overrides: Partial<LiveQuizRow> = {}): LiveQuizRow {
  return {
    id: QUIZ_ID,
    course_id: "course-1",
    title: "Test Quiz",
    status: "published",
    access_code: "ABC123",
    live_open: true,
    live_status: "question",
    current_question_index: 0,
    question_started_at: new Date("2026-01-01T12:00:00Z").toISOString(),
    reveal_ends_at: null,
    seconds_per_question: QUESTION_SECONDS,
    ...overrides,
  };
}

function createMockAdmin(config: MockAdminConfig = {}) {
  let lastUpdate: Record<string, unknown> | null = null;
  const questionIds = config.questionIds ?? ["q1", "q2"];
  const answerCount = config.answerCount ?? 0;

  const makeChain = (terminal: unknown) => {
    const chain: Record<string, unknown> = {};
    chain.eq = () => chain;
    chain.order = () => chain;
    chain.select = (_cols?: unknown, opts?: { count?: string; head?: boolean }) => chain;
    chain.update = (payload: Record<string, unknown>) => {
      lastUpdate = payload;
      return makeChain(null);
    };
    chain.single = () =>
      Promise.resolve({
        data: {
          ...makeLiveQuizRow(),
          ...config.updateRow,
          ...lastUpdate,
        },
      });
    chain.then = (resolve: (v: unknown) => void) => {
      if (terminal !== null) {
        resolve(terminal);
        return;
      }
      resolve({ data: { ...makeLiveQuizRow(), ...config.updateRow, ...lastUpdate } });
    };
    return chain;
  };

  const admin = {
    from: (table: string) => {
      if (table === "quiz_questions") {
        return makeChain({ data: questionIds.map((id) => ({ id })) });
      }
      if (table === "quiz_live_answers") {
        return makeChain({ count: answerCount });
      }
      if (table === "quizzes") {
        return makeChain(null);
      }
      return makeChain(null);
    },
    getLastUpdate: () => lastUpdate,
  };

  return admin as unknown as SupabaseClient & { getLastUpdate: () => Record<string, unknown> | null };
}

describe("buildChoiceStats", () => {
  const question = makeQuestion("Frage?", [
    { text: "A", is_correct: true },
    { text: "B", is_correct: false },
    { text: "C", is_correct: false },
  ]);

  function statsAdmin(answers: { choice_id: string }[]) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: answers }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  it("aggregates answer counts per choice", async () => {
    const admin = statsAdmin([
      { choice_id: "choice-0" },
      { choice_id: "choice-0" },
      { choice_id: "choice-1" },
    ]);
    const stats = await buildChoiceStats(admin, QUIZ_ID, question, false);
    expect(stats.find((s) => s.choice_id === "choice-0")?.count).toBe(2);
    expect(stats.find((s) => s.choice_id === "choice-1")?.count).toBe(1);
    expect(stats.find((s) => s.choice_id === "choice-2")?.count).toBe(0);
  });

  it("includes choice text in stats", async () => {
    const admin = statsAdmin([]);
    const stats = await buildChoiceStats(admin, QUIZ_ID, question, false);
    expect(stats.map((s) => s.text)).toEqual(["A", "B", "C"]);
  });

  it("marks correct choice when revealCorrect is true", async () => {
    const admin = statsAdmin([]);
    const stats = await buildChoiceStats(admin, QUIZ_ID, question, true);
    expect(stats.find((s) => s.text === "A")?.is_correct).toBe(true);
    expect(stats.find((s) => s.text === "B")?.is_correct).toBe(false);
  });

  it("omits is_correct when revealCorrect is false", async () => {
    const admin = statsAdmin([]);
    const stats = await buildChoiceStats(admin, QUIZ_ID, question, false);
    expect(stats.every((s) => s.is_correct === undefined)).toBe(true);
  });

  it("returns zero counts when nobody answered", async () => {
    const admin = statsAdmin([]);
    const stats = await buildChoiceStats(admin, QUIZ_ID, question, true);
    expect(stats.every((s) => s.count === 0)).toBe(true);
  });
});

describe("maybeAdvanceLiveQuiz", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:10Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays in question when timer running and not all answered", async () => {
    const quiz = makeLiveQuizRow({
      question_started_at: new Date("2026-01-01T12:00:00Z").toISOString(),
    });
    const admin = createMockAdmin({ answerCount: 1 });
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 3, 2);
    expect(result.live_status).toBe("question");
    expect(admin.getLastUpdate()).toBeNull();
  });

  it("moves to reveal with fast duration when all answered early", async () => {
    const quiz = makeLiveQuizRow({
      question_started_at: new Date("2026-01-01T12:00:00Z").toISOString(),
    });
    const admin = createMockAdmin({ answerCount: 2 });
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 2, 2);
    expect(result.live_status).toBe("reveal");
    expect(admin.getLastUpdate()?.live_status).toBe("reveal");
    const revealEnds = new Date(String(admin.getLastUpdate()?.reveal_ends_at)).getTime();
    expect(revealEnds - Date.now()).toBe(REVEAL_SECONDS_FAST * 1000);
  });

  it("moves to reveal with slow duration after 30s timeout", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:31Z"));
    const quiz = makeLiveQuizRow({
      question_started_at: new Date("2026-01-01T12:00:00Z").toISOString(),
    });
    const admin = createMockAdmin({ answerCount: 1 });
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 3, 2);
    expect(result.live_status).toBe("reveal");
    const revealEnds = new Date(String(admin.getLastUpdate()?.reveal_ends_at)).getTime();
    expect(revealEnds - Date.now()).toBe(REVEAL_SECONDS_SLOW * 1000);
  });

  it("advances to next question when reveal ends", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:01:00Z"));
    const quiz = makeLiveQuizRow({
      live_status: "reveal",
      current_question_index: 0,
      reveal_ends_at: new Date("2026-01-01T12:00:50Z").toISOString(),
    });
    const admin = createMockAdmin();
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 2, 2);
    expect(result.live_status).toBe("question");
    expect(result.current_question_index).toBe(1);
  });

  it("finishes quiz when reveal ends on last question", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:01:00Z"));
    const quiz = makeLiveQuizRow({
      live_status: "reveal",
      current_question_index: 1,
      reveal_ends_at: new Date("2026-01-01T12:00:50Z").toISOString(),
    });
    const admin = createMockAdmin({ questionIds: ["q1", "q2"] });
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 2, 2);
    expect(result.live_status).toBe("finished");
  });

  it("waits during reveal until reveal_ends_at", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:20Z"));
    const quiz = makeLiveQuizRow({
      live_status: "reveal",
      reveal_ends_at: new Date("2026-01-01T12:00:30Z").toISOString(),
    });
    const admin = createMockAdmin();
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 2, 2);
    expect(result.live_status).toBe("reveal");
    expect(admin.getLastUpdate()).toBeNull();
  });

  it("ignores advance when not in question or reveal", async () => {
    const quiz = makeLiveQuizRow({ live_status: "lobby" });
    const admin = createMockAdmin();
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 0, 2);
    expect(result.live_status).toBe("lobby");
  });

  it("advances on timeout even with zero participants", async () => {
    vi.setSystemTime(new Date("2026-01-01T12:00:35Z"));
    const quiz = makeLiveQuizRow({
      question_started_at: new Date("2026-01-01T12:00:00Z").toISOString(),
    });
    const admin = createMockAdmin({ answerCount: 0 });
    const result = await maybeAdvanceLiveQuiz(admin, quiz, 0, 2);
    expect(result.live_status).toBe("reveal");
  });
});
