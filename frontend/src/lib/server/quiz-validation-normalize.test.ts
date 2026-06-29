import { describe, expect, it } from "vitest";

import {
  describeGeneratedQuizPayloadErrors,
  normalizeGeneratedQuizPayload,
  normalizeQuizDifficulty,
} from "@/lib/server/quiz-validation";
import { baseSettings, makeChoices, poolSettings } from "@/lib/server/quiz-fixtures";
import { parseGeminiJsonText } from "@/lib/server/quiz-generation";

describe("normalizeQuizDifficulty", () => {
  it("accepts English and German labels", () => {
    expect(normalizeQuizDifficulty("easy")).toBe("easy");
    expect(normalizeQuizDifficulty("Leicht")).toBe("easy");
    expect(normalizeQuizDifficulty("mittel")).toBe("medium");
    expect(normalizeQuizDifficulty("SCHWER")).toBe("hard");
  });

  it("rejects unknown labels", () => {
    expect(normalizeQuizDifficulty("insane")).toBeNull();
  });
});

describe("normalizeGeneratedQuizPayload", () => {
  it("normalizes German difficulty and string booleans", () => {
    const raw = {
      questions: [
        {
          prompt: "Frage 1?",
          schwierigkeit: "leicht",
          choices: [
            { text: "A", is_correct: "false" },
            { text: "B", is_correct: "true" },
            { text: "C", is_correct: "false" },
            { text: "D", is_correct: "false" },
          ],
        },
        {
          question: "Frage 2?",
          difficulty: "mittel",
          options: [
            { text: "A", correct: false },
            { text: "B", correct: true },
            { text: "C", correct: false },
            { text: "D", correct: false },
          ],
        },
        {
          frage: "Frage 3?",
          difficulty: "hard",
          answers: makeChoices(4).map((c, i) => ({
            text: c.text,
            isCorrect: i === 0,
          })),
        },
        {
          prompt: "Frage 4?",
          difficulty: "easy",
          choices: makeChoices(4),
        },
        {
          prompt: "Frage 5?",
          difficulty: "medium",
          choices: makeChoices(4),
        },
      ],
    };

    const normalized = normalizeGeneratedQuizPayload(raw, poolSettings);
    expect(normalized?.questions).toHaveLength(5);
    expect(normalized?.questions[0]?.difficulty).toBe("easy");
    expect(normalized?.questions[1]?.difficulty).toBe("medium");
  });

  it("unwraps nested quiz object", () => {
    const raw = {
      quiz: {
        questions: [
          {
            prompt: "Q?",
            choices: makeChoices(4),
          },
        ],
      },
    };
    const normalized = normalizeGeneratedQuizPayload(raw, baseSettings);
    expect(normalized?.questions).toHaveLength(1);
  });

  it("fixes missing is_correct by marking first choice correct", () => {
    const raw = {
      questions: [
        {
          prompt: "Q?",
          choices: [
            { text: "A" },
            { text: "B" },
            { text: "C" },
            { text: "D" },
          ],
        },
      ],
    };
    const normalized = normalizeGeneratedQuizPayload(raw, {
      ...baseSettings,
      question_count: 1,
    });
    expect(normalized?.questions[0]?.choices.filter((c) => c.is_correct)).toHaveLength(1);
  });
});

describe("describeGeneratedQuizPayloadErrors", () => {
  it("lists bucket mismatch for pool settings", () => {
    const raw = {
      questions: Array.from({ length: 5 }, (_, i) => ({
        prompt: `F${i}?`,
        difficulty: "easy",
        choices: makeChoices(4),
      })),
    };
    const errors = describeGeneratedQuizPayloadErrors(raw, poolSettings);
    expect(errors.some((e) => e.includes("easy:"))).toBe(true);
  });
});

describe("parseGeminiJsonText", () => {
  it("parses fenced json blocks", () => {
    const parsed = parseGeminiJsonText('```json\n{"questions":[]}\n```');
    expect(parsed).toEqual({ questions: [] });
  });
});
