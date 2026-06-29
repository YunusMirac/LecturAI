import { describe, expect, it } from "vitest";

import { buildStudentExamInstance, orderQuestionsBySnapshot } from "@/lib/server/quiz-exam-draw";
import { resolveEffectiveDrawCounts } from "@/lib/server/quiz-validation";
import {
  makePoolQuestions,
  poolSettings,
  seededRng,
} from "@/lib/server/quiz-fixtures";

describe("exam pool integration scenarios", () => {
  const pool = makePoolQuestions({ easy: 10, medium: 10, hard: 20 });

  it("full flow: pool 40 → config 5/5/10 → student snapshot size 20", () => {
    const expanded = { easy: 5, medium: 5, hard: 10 };
    expect(expanded.easy + expanded.medium + expanded.hard).toBe(20);

    const studentA = buildStudentExamInstance(pool, expanded, seededRng(1));
    const studentB = buildStudentExamInstance(pool, expanded, seededRng(2));
    expect(studentA.ok && studentB.ok).toBe(true);
    if (!studentA.ok || !studentB.ok) return;

    expect(studentA.snapshot).toHaveLength(20);
    expect(studentB.snapshot).toHaveLength(20);
    expect(studentA.snapshot.map((s) => s.question_id).join()).not.toBe(
      studentB.snapshot.map((s) => s.question_id).join(),
    );
  });

  it("produces different snapshots for different seeds", () => {
    const smallPool = makePoolQuestions({ easy: 5, medium: 5, hard: 5 });
    const draw = { easy: 2, medium: 2, hard: 2 };
    const a = buildStudentExamInstance(smallPool, draw, seededRng(1));
    const b = buildStudentExamInstance(smallPool, draw, seededRng(2));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.snapshot.map((s) => s.question_id).join()).not.toBe(
      b.snapshot.map((s) => s.question_id).join(),
    );
  });

  it("reload stability: same seed yields identical ordered snapshot", () => {
    const draw = { easy: 3, medium: 2, hard: 5 };
    const first = buildStudentExamInstance(pool, draw, seededRng(42));
    const reload = buildStudentExamInstance(pool, draw, seededRng(42));
    expect(first).toEqual(reload);
  });

  it("legacy quiz without exam_config uses all pool questions", () => {
    const legacyPool = makePoolQuestions({ easy: 0, medium: 5, hard: 0 });
    const draw = resolveEffectiveDrawCounts(null, { easy: 0, medium: 5, hard: 0 }, 5);
    expect(draw).toEqual({ easy: 0, medium: 5, hard: 0 });
    const instance = buildStudentExamInstance(legacyPool, draw, seededRng(1));
    expect(instance.ok).toBe(true);
    if (!instance.ok) return;
    expect(instance.snapshot).toHaveLength(5);
  });

  it("orderQuestionsBySnapshot preserves shuffled order", () => {
    const instance = buildStudentExamInstance(
      pool,
      { easy: 2, medium: 1, hard: 1 },
      seededRng(5),
    );
    expect(instance.ok).toBe(true);
    if (!instance.ok) return;
    const ordered = orderQuestionsBySnapshot(pool, instance.snapshot);
    expect(ordered).toHaveLength(4);
    expect(ordered.map((q) => q.id)).toEqual(
      instance.snapshot
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => s.question_id),
    );
  });

  it("pool settings metadata present on exam quiz type", () => {
    expect(poolSettings.pool_counts).toEqual({ easy: 2, medium: 2, hard: 1 });
    expect(poolSettings.question_count).toBe(5);
  });
});
