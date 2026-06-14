import { describe, expect, it } from "vitest";

import { makeQuestion } from "@/lib/server/quiz-fixtures";
import { scoreExamAnswers } from "@/lib/server/quiz-exam";
import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";
import {
  computeExamSecondsRemaining,
  isExamTimedOut,
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
});
