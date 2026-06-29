import { describe, expect, it } from "vitest";

import {
  countQuestionsInPool,
  parseExamConfig,
  parseQuizSettings,
  resolveEffectiveDrawCounts,
  resolveExamDuration,
  validateCreateQuizSettings,
  validateExamConfig,
  validateGeneratedQuizPayload,
  validateQuestionForPublish,
  validateQuizForPublish,
} from "@/lib/server/quiz-validation";
import {
  MAX_CHOICES,
  MAX_EXAM_DURATION_SECONDS,
  MAX_POOL_PER_DIFFICULTY,
  MAX_QUESTIONS,
  MIN_CHOICES,
  MIN_EXAM_DURATION_SECONDS,
  MIN_POOL_TOTAL,
  MIN_QUESTIONS,
} from "@/lib/quiz-labels";
import {
  baseExamConfig,
  baseSettings,
  makeGeneratedPayload,
  makePoolGeneratedPayload,
  makeQuestion,
  poolSettings,
} from "@/lib/server/quiz-fixtures";
import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";

describe("parseQuizSettings", () => {
  it("parses valid settings object", () => {
    expect(parseQuizSettings(baseSettings)).toEqual(baseSettings);
  });

  it("rejects non-object input", () => {
    expect(parseQuizSettings(null)).toBeNull();
    expect(parseQuizSettings("medium")).toBeNull();
    expect(parseQuizSettings([])).toBeNull();
  });

  it("rejects non-integer counts", () => {
    expect(parseQuizSettings({ ...baseSettings, question_count: 5.5 })).toBeNull();
    expect(parseQuizSettings({ ...baseSettings, choice_count: NaN })).toBeNull();
  });

  it("rejects invalid difficulty", () => {
    expect(parseQuizSettings({ ...baseSettings, difficulty: "insane" })).toBeNull();
  });

  it("accepts all difficulty levels", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      expect(parseQuizSettings({ ...baseSettings, difficulty })?.difficulty).toBe(difficulty);
    }
  });

  it("parses pool_counts settings", () => {
    expect(parseQuizSettings(poolSettings)).toEqual(poolSettings);
  });

  it("derives question_count from pool_counts sum", () => {
    const parsed = parseQuizSettings({
      choice_count: 4,
      pool_counts: { easy: 10, medium: 10, hard: 20 },
    });
    expect(parsed?.question_count).toBe(40);
  });

  it("rejects invalid pool_counts", () => {
    expect(parseQuizSettings({ choice_count: 4, pool_counts: { easy: -1, medium: 0, hard: 0 } })).toBeNull();
    expect(parseQuizSettings({ choice_count: 4, pool_counts: { easy: 1.5, medium: 0, hard: 0 } })).toBeNull();
  });
});

describe("parseExamConfig", () => {
  it("parses valid exam config", () => {
    expect(parseExamConfig(baseExamConfig)).toEqual(baseExamConfig);
  });

  it("rejects invalid config", () => {
    expect(parseExamConfig(null)).toBeNull();
    expect(parseExamConfig({ duration_seconds: 60 })).toBeNull();
  });
});

describe("resolveExamDuration", () => {
  it("uses config duration when set", () => {
    expect(resolveExamDuration({ duration_seconds: 1800, draw_counts: { easy: 1, medium: 0, hard: 0 } })).toBe(1800);
  });

  it("falls back to default constant", () => {
    expect(resolveExamDuration(null)).toBe(EXAM_DURATION_SECONDS);
  });
});

describe("validateCreateQuizSettings pool", () => {
  it("accepts valid pool settings", () => {
    expect(validateCreateQuizSettings(poolSettings)).toEqual({ ok: true });
  });

  it("rejects pool total below minimum", () => {
    const r = validateCreateQuizSettings({
      choice_count: 4,
      pool_counts: { easy: 1, medium: 1, hard: 0 },
    });
    expect("status" in r).toBe(true);
    if ("status" in r) expect(r.body.pool_total?.[0]).toContain(String(MIN_POOL_TOTAL));
  });

  it("rejects pool total above maximum", () => {
    const r = validateCreateQuizSettings({
      choice_count: 4,
      pool_counts: { easy: 31, medium: 31, hard: 31 },
    });
    expect("status" in r).toBe(true);
  });

  it("rejects per-level above max", () => {
    const r = validateCreateQuizSettings({
      choice_count: 4,
      pool_counts: { easy: MAX_POOL_PER_DIFFICULTY + 1, medium: 0, hard: 0 },
    });
    expect("status" in r).toBe(true);
  });
});

describe("validateExamConfig", () => {
  const pool = { easy: 10, medium: 10, hard: 20 };

  it("accepts valid draw within pool", () => {
    expect(
      validateExamConfig(pool, { easy: 5, medium: 5, hard: 10 }, 3600),
    ).toEqual({ ok: true });
  });

  it("rejects draw above pool", () => {
    const r = validateExamConfig(pool, { easy: 11, medium: 0, hard: 0 }, 3600);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.body.draw_easy?.[0]).toContain("10");
  });

  it("rejects zero total draw", () => {
    const r = validateExamConfig(pool, { easy: 0, medium: 0, hard: 0 }, 3600);
    expect(r.ok).toBe(false);
  });

  it("rejects duration below minimum", () => {
    const r = validateExamConfig(pool, { easy: 1, medium: 0, hard: 0 }, MIN_EXAM_DURATION_SECONDS - 1);
    expect(r.ok).toBe(false);
  });

  it("rejects duration above maximum", () => {
    const r = validateExamConfig(pool, { easy: 1, medium: 0, hard: 0 }, MAX_EXAM_DURATION_SECONDS + 1);
    expect(r.ok).toBe(false);
  });

  it("accepts boundary durations", () => {
    expect(validateExamConfig(pool, { easy: 1, medium: 0, hard: 0 }, MIN_EXAM_DURATION_SECONDS).ok).toBe(true);
    expect(validateExamConfig(pool, { easy: 1, medium: 0, hard: 0 }, MAX_EXAM_DURATION_SECONDS).ok).toBe(true);
  });

  for (let n = 0; n <= 5; n += 1) {
    it(`draw easy=${n} valid when pool has 5`, () => {
      expect(validateExamConfig(pool, { easy: n, medium: 0, hard: 0 }, 3600).ok).toBe(n > 0);
    });
  }
});

describe("validateCreateQuizSettings", () => {
  it("accepts boundary values", () => {
    expect(
      validateCreateQuizSettings({
        question_count: MIN_QUESTIONS,
        choice_count: MIN_CHOICES,
        difficulty: "easy",
      }),
    ).toEqual({ ok: true });
    expect(
      validateCreateQuizSettings({
        question_count: MAX_QUESTIONS,
        choice_count: MAX_CHOICES,
        difficulty: "hard",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects question count below minimum", () => {
    const r = validateCreateQuizSettings({ ...baseSettings, question_count: MIN_QUESTIONS - 1 });
    expect("status" in r).toBe(true);
    if ("status" in r) {
      expect(r.status).toBe(400);
      expect(r.body.question_count?.[0]).toContain(String(MIN_QUESTIONS));
    }
  });

  it("rejects question count above maximum", () => {
    const r = validateCreateQuizSettings({ ...baseSettings, question_count: MAX_QUESTIONS + 1 });
    expect("status" in r).toBe(true);
  });

  it("rejects choice count out of range", () => {
    const low = validateCreateQuizSettings({ ...baseSettings, choice_count: MIN_CHOICES - 1 });
    const high = validateCreateQuizSettings({ ...baseSettings, choice_count: MAX_CHOICES + 1 });
    expect("status" in low).toBe(true);
    expect("status" in high).toBe(true);
  });
});

describe("validateGeneratedQuizPayload", () => {
  it("accepts exact question count", () => {
    expect(validateGeneratedQuizPayload(makeGeneratedPayload(5, 4), baseSettings)).toBe(true);
  });

  it("accepts question count within ±2 tolerance", () => {
    expect(
      validateGeneratedQuizPayload(makeGeneratedPayload(3, 4), baseSettings),
    ).toBe(true);
    expect(
      validateGeneratedQuizPayload(makeGeneratedPayload(7, 4), baseSettings),
    ).toBe(true);
  });

  it("rejects question count outside tolerance", () => {
    expect(
      validateGeneratedQuizPayload(makeGeneratedPayload(1, 4), baseSettings),
    ).toBe(false);
    expect(
      validateGeneratedQuizPayload(makeGeneratedPayload(10, 4), baseSettings),
    ).toBe(false);
  });

  it("rejects empty questions array", () => {
    expect(validateGeneratedQuizPayload({ questions: [] }, baseSettings)).toBe(false);
  });

  it("rejects empty prompt", () => {
    const payload = {
      questions: [{ prompt: "   ", choices: makeGeneratedPayload(1, 4).questions[0]!.choices }],
    };
    expect(validateGeneratedQuizPayload(payload, { ...baseSettings, question_count: 1 })).toBe(
      false,
    );
  });

  it("rejects two correct answers", () => {
    const payload = {
      questions: [
        {
          prompt: "Frage?",
          choices: [
            { text: "A", is_correct: true },
            { text: "B", is_correct: true },
            { text: "C", is_correct: false },
            { text: "D", is_correct: false },
          ],
        },
      ],
    };
    expect(validateGeneratedQuizPayload(payload, { ...baseSettings, question_count: 1 })).toBe(
      false,
    );
  });

  it("rejects empty choice text", () => {
    const payload = {
      questions: [
        {
          prompt: "Frage?",
          choices: [
            { text: " ", is_correct: true },
            { text: "B", is_correct: false },
            { text: "C", is_correct: false },
            { text: "D", is_correct: false },
          ],
        },
      ],
    };
    expect(validateGeneratedQuizPayload(payload, { ...baseSettings, question_count: 1 })).toBe(
      false,
    );
  });

  it("rejects non-object payload", () => {
    expect(validateGeneratedQuizPayload("invalid", baseSettings)).toBe(false);
  });

  it("accepts pool payload with difficulty tags", () => {
    const payload = makePoolGeneratedPayload({ easy: 2, medium: 2, hard: 1 }, 4);
    expect(validateGeneratedQuizPayload(payload, poolSettings)).toBe(true);
  });

  it("rejects pool payload missing difficulty", () => {
    const payload = makeGeneratedPayload(5, 4, "medium");
    expect(validateGeneratedQuizPayload(payload, poolSettings)).toBe(false);
  });

  it("rejects pool payload with wrong bucket count", () => {
    const payload = makePoolGeneratedPayload({ easy: 5, medium: 0, hard: 0 }, 4);
    expect(validateGeneratedQuizPayload(payload, poolSettings)).toBe(false);
  });
});

describe("validateQuestionForPublish", () => {
  it("accepts valid question", () => {
    const q = makeQuestion("Was ist 2+2?", [
      { text: "4", is_correct: true },
      { text: "5", is_correct: false },
    ]);
    expect(validateQuestionForPublish(q)).toEqual({ ok: true });
  });

  it("rejects empty prompt", () => {
    const q = makeQuestion("  ", [
      { text: "A", is_correct: true },
      { text: "B", is_correct: false },
    ]);
    expect(validateQuestionForPublish(q).ok).toBe(false);
  });

  it("rejects fewer than two choices", () => {
    const q = makeQuestion("Frage?", [{ text: "Nur eine", is_correct: true }]);
    expect(validateQuestionForPublish(q).ok).toBe(false);
  });

  it("rejects zero correct answers", () => {
    const q = makeQuestion("Frage?", [
      { text: "A", is_correct: false },
      { text: "B", is_correct: false },
    ]);
    expect(validateQuestionForPublish(q).ok).toBe(false);
  });

  it("rejects multiple correct answers", () => {
    const q = makeQuestion("Frage?", [
      { text: "A", is_correct: true },
      { text: "B", is_correct: true },
    ]);
    expect(validateQuestionForPublish(q).ok).toBe(false);
  });

  it("rejects blank choice text", () => {
    const q = makeQuestion("Frage?", [
      { text: "A", is_correct: true },
      { text: "  ", is_correct: false },
    ]);
    expect(validateQuestionForPublish(q).ok).toBe(false);
  });
});

describe("validateQuizForPublish", () => {
  it("requires at least one question", () => {
    const r = validateQuizForPublish([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("Mindestens eine Frage");
  });

  it("propagates first invalid question error", () => {
    const valid = makeQuestion("OK?", [
      { text: "Ja", is_correct: true },
      { text: "Nein", is_correct: false },
    ]);
    const invalid = makeQuestion("Bad?", [
      { text: "A", is_correct: false },
      { text: "B", is_correct: false },
    ]);
    const r = validateQuizForPublish([valid, invalid]);
    expect(r.ok).toBe(false);
  });

  it("accepts multi-question quiz", () => {
    const questions = [
      makeQuestion("Q1?", [
        { text: "A", is_correct: true },
        { text: "B", is_correct: false },
      ]),
      makeQuestion("Q2?", [
        { text: "X", is_correct: false },
        { text: "Y", is_correct: true },
      ]),
    ];
    expect(validateQuizForPublish(questions)).toEqual({ ok: true });
  });
});

describe("countQuestionsInPool", () => {
  it("counts questions by difficulty", () => {
    const questions = [
      makeQuestion("Q1?", [], { difficulty: "easy" }),
      makeQuestion("Q2?", [], { difficulty: "easy" }),
      makeQuestion("Q3?", [], { difficulty: "medium" }),
      makeQuestion("Q4?", [], { difficulty: "hard" }),
    ];
    expect(countQuestionsInPool(questions)).toEqual({ easy: 2, medium: 1, hard: 1 });
  });

  it("returns all zeros for empty list", () => {
    expect(countQuestionsInPool([])).toEqual({ easy: 0, medium: 0, hard: 0 });
  });

  it("falls back to medium for null difficulty", () => {
    const q = makeQuestion("Q?", [], { difficulty: undefined });
    expect(countQuestionsInPool([q])).toEqual({ easy: 0, medium: 1, hard: 0 });
  });

  it("ignores unknown difficulty values", () => {
    const q = makeQuestion("Q?", [], { difficulty: "extreme" as never });
    expect(countQuestionsInPool([q])).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});

describe("resolveEffectiveDrawCounts", () => {
  const pool = { easy: 5, medium: 5, hard: 5 };

  it("uses examConfig draw_counts when present", () => {
    const config = { duration_seconds: 3600, draw_counts: { easy: 2, medium: 2, hard: 1 } };
    expect(resolveEffectiveDrawCounts(config, pool, 15)).toEqual({ easy: 2, medium: 2, hard: 1 });
  });

  it("falls back to pool counts when no examConfig", () => {
    expect(resolveEffectiveDrawCounts(null, pool, 15)).toEqual(pool);
  });

  it("falls back to pool counts when examConfig has no draw_counts", () => {
    const config = { duration_seconds: 3600, draw_counts: undefined as never };
    expect(resolveEffectiveDrawCounts(config, pool, 15)).toEqual(pool);
  });

  it("falls back to pool counts when examConfig is undefined", () => {
    expect(resolveEffectiveDrawCounts(undefined, pool, 0)).toEqual(pool);
  });
});
