import { describe, expect, it } from "vitest";

import {
  EXAM_DIFFICULTY_ORDER,
  emptyDifficultyCounts,
  totalDifficultyCounts,
} from "@/lib/quiz/domain";

describe("totalDifficultyCounts", () => {
  it("sums all three difficulty levels", () => {
    expect(totalDifficultyCounts({ easy: 3, medium: 5, hard: 2 })).toBe(10);
  });

  it("returns 0 for all-zero input", () => {
    expect(totalDifficultyCounts({ easy: 0, medium: 0, hard: 0 })).toBe(0);
  });

  it("handles single non-zero level", () => {
    expect(totalDifficultyCounts({ easy: 7, medium: 0, hard: 0 })).toBe(7);
    expect(totalDifficultyCounts({ easy: 0, medium: 4, hard: 0 })).toBe(4);
    expect(totalDifficultyCounts({ easy: 0, medium: 0, hard: 9 })).toBe(9);
  });

  it("handles asymmetric counts", () => {
    expect(totalDifficultyCounts({ easy: 1, medium: 10, hard: 100 })).toBe(111);
  });
});

describe("emptyDifficultyCounts", () => {
  it("returns an object with all difficulty levels set to 0", () => {
    expect(emptyDifficultyCounts()).toEqual({ easy: 0, medium: 0, hard: 0 });
  });

  it("returns a fresh object on every call", () => {
    const a = emptyDifficultyCounts();
    const b = emptyDifficultyCounts();
    a.easy = 99;
    expect(b.easy).toBe(0);
  });
});

describe("EXAM_DIFFICULTY_ORDER", () => {
  it("contains exactly three levels", () => {
    expect(EXAM_DIFFICULTY_ORDER).toHaveLength(3);
  });

  it("orders easy → medium → hard", () => {
    expect(EXAM_DIFFICULTY_ORDER[0]).toBe("easy");
    expect(EXAM_DIFFICULTY_ORDER[1]).toBe("medium");
    expect(EXAM_DIFFICULTY_ORDER[2]).toBe("hard");
  });

  it("contains all expected difficulty values", () => {
    expect(EXAM_DIFFICULTY_ORDER).toContain("easy");
    expect(EXAM_DIFFICULTY_ORDER).toContain("medium");
    expect(EXAM_DIFFICULTY_ORDER).toContain("hard");
  });
});
