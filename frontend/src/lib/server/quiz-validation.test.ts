import { describe, expect, it } from "vitest";

import {
  parseQuizSettings,
  validateCreateQuizSettings,
  validateGeneratedQuizPayload,
  validateQuestionForPublish,
  validateQuizForPublish,
} from "@/lib/server/quiz-validation";
import {
  MAX_CHOICES,
  MAX_QUESTIONS,
  MIN_CHOICES,
  MIN_QUESTIONS,
} from "@/lib/quiz-labels";
import {
  baseSettings,
  makeGeneratedPayload,
  makeQuestion,
} from "@/lib/server/quiz-fixtures";

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
