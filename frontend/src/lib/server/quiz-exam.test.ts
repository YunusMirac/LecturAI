import { describe, expect, it } from "vitest";

import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";
import { makeQuestion, makePoolQuestions, seededRng } from "@/lib/server/quiz-fixtures";
import { buildStudentExamInstance } from "@/lib/server/quiz-exam-draw";
import {
  computeExamSecondsRemaining,
  isExamTimedOut,
  scoreExamAnswers,
} from "@/lib/server/quiz-exam";

describe("computeExamSecondsRemaining", () => {
  const started = "2026-06-01T10:00:00Z";

  it("returns full duration at start", () => {
    expect(computeExamSecondsRemaining(started, Date.parse(started))).toBe(EXAM_DURATION_SECONDS);
  });

  it("returns 0 after timeout", () => {
    const now = Date.parse("2026-06-01T11:01:00Z");
    expect(computeExamSecondsRemaining(started, now)).toBe(0);
    expect(isExamTimedOut(started, now)).toBe(true);
  });

  it("counts down partially", () => {
    const now = Date.parse("2026-06-01T10:30:00Z");
    expect(computeExamSecondsRemaining(started, now)).toBe(EXAM_DURATION_SECONDS - 1800);
  });

  it("uses custom duration when provided", () => {
    const custom = 1800;
    expect(computeExamSecondsRemaining(started, Date.parse(started), custom)).toBe(custom);
    expect(
      computeExamSecondsRemaining(started, Date.parse("2026-06-01T10:15:00Z"), custom),
    ).toBe(900);
  });

  it("isExamTimedOut respects custom duration", () => {
    const custom = 1800;
    expect(isExamTimedOut(started, Date.parse("2026-06-01T10:29:00Z"), custom)).toBe(false);
    expect(isExamTimedOut(started, Date.parse("2026-06-01T10:31:00Z"), custom)).toBe(true);
  });
});

describe("scoreExamAnswers", () => {
  const q1 = makeQuestion("Q1?", [
    { text: "A", is_correct: true },
    { text: "B", is_correct: false },
  ], { id: "q1" });
  const q2 = makeQuestion("Q2?", [
    { text: "C", is_correct: false },
    { text: "D", is_correct: true },
  ], { id: "q2" });

  it("scores all correct", () => {
    const result = scoreExamAnswers(
      [q1, q2],
      [
        { question_id: "q1", choice_id: "choice-0" },
        { question_id: "q2", choice_id: "choice-1" },
      ],
    );
    expect(result.correct_count).toBe(2);
    expect(result.total_count).toBe(2);
    expect(result.percent_correct).toBe(100);
  });

  it("scores partial and missing answers as wrong", () => {
    const result = scoreExamAnswers([q1, q2], [{ question_id: "q1", choice_id: "choice-1" }]);
    expect(result.correct_count).toBe(0);
    expect(result.percent_correct).toBe(0);
  });

  it("handles empty quiz", () => {
    expect(scoreExamAnswers([], [])).toEqual({
      correct_count: 0,
      total_count: 0,
      percent_correct: 0,
    });
  });

  it("scores only provided question subset", () => {
    const pool = makePoolQuestions({ easy: 2, medium: 2, hard: 2 });
    const instance = buildStudentExamInstance(
      pool,
      { easy: 1, medium: 1, hard: 1 },
      seededRng(1),
    );
    expect(instance.ok).toBe(true);
    if (!instance.ok) return;

    const subset = instance.snapshot
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => pool.find((q) => q.id === s.question_id)!);

    const result = scoreExamAnswers(subset, [
      { question_id: subset[0]!.id, choice_id: "choice-0" },
    ]);
    expect(result.total_count).toBe(3);
    expect(result.correct_count).toBeLessThanOrEqual(1);
  });
});

describe("buildStudentExamInstance integration", () => {
  it("produces different snapshots for different seeds", () => {
    const pool = makePoolQuestions({ easy: 5, medium: 5, hard: 5 });
    const draw = { easy: 2, medium: 2, hard: 2 };
    const a = buildStudentExamInstance(pool, draw, seededRng(1));
    const b = buildStudentExamInstance(pool, draw, seededRng(2));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const idsA = a.snapshot.map((s) => s.question_id).join(",");
    const idsB = b.snapshot.map((s) => s.question_id).join(",");
    expect(idsA).not.toBe(idsB);
  });

  it("is stable for same seed on repeat", () => {
    const pool = makePoolQuestions({ easy: 3, medium: 3, hard: 3 });
    const draw = { easy: 1, medium: 1, hard: 1 };
    const first = buildStudentExamInstance(pool, draw, seededRng(99));
    const second = buildStudentExamInstance(pool, draw, seededRng(99));
    expect(first).toEqual(second);
  });
});
