import { describe, expect, it } from "vitest";

import {
  MAX_CHOICES,
  MAX_QUESTIONS,
  MIN_CHOICES,
  MIN_QUESTIONS,
  difficultyLabelDe,
  quizStatusLabelDe,
} from "@/lib/quiz-labels";

describe("quiz constants", () => {
  it("defines sensible bounds for wizard inputs", () => {
    expect(MIN_QUESTIONS).toBeLessThan(MAX_QUESTIONS);
    expect(MIN_CHOICES).toBeLessThan(MAX_CHOICES);
    expect(MIN_QUESTIONS).toBe(3);
    expect(MAX_QUESTIONS).toBe(30);
    expect(MIN_CHOICES).toBe(2);
    expect(MAX_CHOICES).toBe(6);
  });
});

describe("quizStatusLabelDe", () => {
  it("maps known statuses to German labels", () => {
    expect(quizStatusLabelDe("generating")).toBe("Wird erstellt…");
    expect(quizStatusLabelDe("draft")).toBe("Entwurf");
    expect(quizStatusLabelDe("published")).toBe("Veröffentlicht");
    expect(quizStatusLabelDe("failed")).toBe("Fehlgeschlagen");
  });

  it("returns unknown status unchanged", () => {
    expect(quizStatusLabelDe("archived")).toBe("archived");
  });
});

describe("difficultyLabelDe", () => {
  it("maps difficulty levels", () => {
    expect(difficultyLabelDe("easy")).toBe("Leicht");
    expect(difficultyLabelDe("medium")).toBe("Mittel");
    expect(difficultyLabelDe("hard")).toBe("Schwer");
  });

  it("returns unknown difficulty unchanged", () => {
    expect(difficultyLabelDe("expert")).toBe("expert");
  });
});
