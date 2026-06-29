import { describe, expect, it } from "vitest";

import {
  makePoolQuestions,
  seededRng,
} from "@/lib/server/quiz-fixtures";
import {
  buildStudentExamInstance,
  sampleQuestionsByDifficulty,
  shuffleQuestionIds,
  snapshotQuestionIds,
} from "@/lib/server/quiz-exam-draw";

describe("sampleQuestionsByDifficulty", () => {
  const pool = makePoolQuestions({ easy: 5, medium: 5, hard: 10 });

  it("draws exact counts per difficulty", () => {
    const result = sampleQuestionsByDifficulty(
      pool,
      { easy: 2, medium: 3, hard: 4 },
      seededRng(42),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questionIds).toHaveLength(9);
    const easyIds = result.questionIds.filter((id) => id.startsWith("easy-"));
    const mediumIds = result.questionIds.filter((id) => id.startsWith("medium-"));
    const hardIds = result.questionIds.filter((id) => id.startsWith("hard-"));
    expect(easyIds).toHaveLength(2);
    expect(mediumIds).toHaveLength(3);
    expect(hardIds).toHaveLength(4);
  });

  it("returns all questions when draw equals pool", () => {
    const result = sampleQuestionsByDifficulty(
      pool,
      { easy: 5, medium: 5, hard: 10 },
      seededRng(1),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questionIds).toHaveLength(20);
    expect(new Set(result.questionIds).size).toBe(20);
  });

  it("returns empty subset when all draws are zero", () => {
    const result = sampleQuestionsByDifficulty(pool, { easy: 0, medium: 0, hard: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questionIds).toHaveLength(0);
  });

  it("fails when draw exceeds pool for a level", () => {
    const result = sampleQuestionsByDifficulty(pool, { easy: 6, medium: 0, hard: 0 });
    expect(result.ok).toBe(false);
  });

  it("never duplicates question ids within result", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const result = sampleQuestionsByDifficulty(
        pool,
        { easy: 3, medium: 2, hard: 5 },
        seededRng(seed),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(new Set(result.questionIds).size).toBe(result.questionIds.length);
    }
  });

  it("only selects ids from the pool", () => {
    const allowed = new Set(pool.map((q) => q.id));
    const result = sampleQuestionsByDifficulty(
      pool,
      { easy: 1, medium: 1, hard: 1 },
      seededRng(99),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const id of result.questionIds) {
      expect(allowed.has(id)).toBe(true);
    }
  });

  it("produces different selections with different seeds", () => {
    const a = sampleQuestionsByDifficulty(
      pool,
      { easy: 2, medium: 2, hard: 2 },
      seededRng(1),
    );
    const b = sampleQuestionsByDifficulty(
      pool,
      { easy: 2, medium: 2, hard: 2 },
      seededRng(2),
    );
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.questionIds.sort().join()).not.toBe(b.questionIds.sort().join());
  });

  it("is deterministic with same seed", () => {
    const draw = { easy: 2, medium: 1, hard: 3 };
    const a = sampleQuestionsByDifficulty(pool, draw, seededRng(7));
    const b = sampleQuestionsByDifficulty(pool, draw, seededRng(7));
    expect(a).toEqual(b);
  });
});

describe("shuffleQuestionIds", () => {
  it("returns all ids with contiguous sort_order", () => {
    const ids = ["a", "b", "c", "d"];
    const shuffled = shuffleQuestionIds(ids, seededRng(5));
    expect(shuffled).toHaveLength(4);
    expect(shuffled.map((s) => s.sort_order)).toEqual([0, 1, 2, 3]);
    expect(shuffled.map((s) => s.question_id).sort()).toEqual(ids.sort());
  });

  it("handles single element", () => {
    expect(shuffleQuestionIds(["only"], seededRng(1))).toEqual([
      { question_id: "only", sort_order: 0 },
    ]);
  });

  it("handles empty list", () => {
    expect(shuffleQuestionIds([])).toEqual([]);
  });

  it("is deterministic with seeded rng", () => {
    const ids = ["q1", "q2", "q3", "q4", "q5"];
    expect(shuffleQuestionIds(ids, seededRng(11))).toEqual(
      shuffleQuestionIds(ids, seededRng(11)),
    );
  });

  it("produces at least two distinct orderings across seeds", () => {
    const ids = ["a", "b", "c", "d"];
    const orderings = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) =>
        shuffleQuestionIds(ids, seededRng(seed))
          .map((s) => s.question_id)
          .join(","),
      ),
    );
    expect(orderings.size).toBeGreaterThanOrEqual(2);
  });
});

describe("buildStudentExamInstance", () => {
  const pool = makePoolQuestions({ easy: 4, medium: 4, hard: 4 });

  it("combines sample and shuffle with correct total", () => {
    const result = buildStudentExamInstance(
      pool,
      { easy: 2, medium: 1, hard: 3 },
      seededRng(3),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot).toHaveLength(6);
    expect(new Set(result.snapshot.map((s) => s.question_id)).size).toBe(6);
  });

  it("propagates sample errors", () => {
    const result = buildStudentExamInstance(pool, { easy: 10, medium: 0, hard: 0 });
    expect(result.ok).toBe(false);
  });
});

describe("snapshotQuestionIds", () => {
  it("builds a set of question ids", () => {
    const set = snapshotQuestionIds([
      { question_id: "a", sort_order: 0 },
      { question_id: "b", sort_order: 1 },
    ]);
    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("sampleQuestionsByDifficulty parametrized", () => {
  const cases = [
    { easy: 1, medium: 0, hard: 0 },
    { easy: 0, medium: 2, hard: 0 },
    { easy: 0, medium: 0, hard: 3 },
    { easy: 1, medium: 1, hard: 1 },
    { easy: 3, medium: 2, hard: 4 },
  ] as const;

  for (const [index, draw] of cases.entries()) {
    it(`case ${index + 1}: draw ${JSON.stringify(draw)} from standard pool`, () => {
      const pool = makePoolQuestions({ easy: 5, medium: 5, hard: 10 });
      const result = sampleQuestionsByDifficulty(pool, draw, seededRng(index + 100));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.questionIds).toHaveLength(draw.easy + draw.medium + draw.hard);
    });
  }
});
