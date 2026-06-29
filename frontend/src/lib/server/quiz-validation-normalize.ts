import type {
  DifficultyCounts,
  GeneratedQuizPayload,
  QuizDifficulty,
  QuizSettings,
} from "@/lib/server/quiz-types";
import { emptyDifficultyCounts, totalDifficultyCounts } from "@/lib/server/quiz-types";
import { EXAM_DIFFICULTY_ORDER } from "@/lib/quiz/domain";

export { EXAM_DIFFICULTY_ORDER as DIFFICULTIES };

export function isWithinTolerance(actual: number, expected: number): boolean {
  return actual >= Math.max(0, expected - 2) && actual <= expected + 2;
}

export function countQuestionsByDifficulty(
  questions: GeneratedQuizPayload["questions"],
): DifficultyCounts {
  const counts = emptyDifficultyCounts();
  for (const q of questions) {
    const d = q.difficulty;
    if (d === "easy" || d === "medium" || d === "hard") {
      counts[d] += 1;
    }
  }
  return counts;
}

function parseTruthyBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "ja") return true;
    if (s === "false" || s === "0" || s === "no" || s === "nein") return false;
  }
  return false;
}

export function normalizeQuizDifficulty(raw: unknown): QuizDifficulty | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (s === "easy" || s === "leicht" || s === "einfach" || s === "e") return "easy";
  if (s === "medium" || s === "mittel" || s === "mittelschwer" || s === "m") return "medium";
  if (s === "hard" || s === "schwer" || s === "schwierig" || s === "h") return "hard";
  return null;
}

function readStringField(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractQuestionsArray(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object" || payload === null) return null;
  const o = payload as Record<string, unknown>;

  const direct = o.questions ?? o.fragen ?? o.items;
  if (Array.isArray(direct)) return direct;

  for (const nestedKey of ["quiz", "data", "result", "payload"]) {
    const nested = o[nestedKey];
    if (typeof nested === "object" && nested !== null) {
      const inner = extractQuestionsArray(nested);
      if (inner) return inner;
    }
  }
  return null;
}

function normalizeChoice(raw: unknown): { text: string; is_correct: boolean } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const text = readStringField(o, ["text", "answer", "label", "option", "antwort"]);
  if (!text) return null;
  const is_correct = parseTruthyBoolean(o.is_correct ?? o.isCorrect ?? o.correct);
  return { text, is_correct };
}

function normalizeQuestion(
  raw: unknown,
  settings: QuizSettings,
  index: number,
): GeneratedQuizPayload["questions"][number] | null {
  void index;
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const prompt = readStringField(o, ["prompt", "question", "text", "frage"]);
  if (!prompt) return null;

  const choicesRaw = o.choices ?? o.options ?? o.answers ?? o.antworten;
  if (!Array.isArray(choicesRaw)) return null;

  const choices = choicesRaw
    .map((c) => normalizeChoice(c))
    .filter((c): c is { text: string; is_correct: boolean } => c != null)
    .slice(0, settings.choice_count);

  if (choices.length !== settings.choice_count) return null;

  let correctCount = choices.filter((c) => c.is_correct).length;
  if (correctCount === 0) {
    choices[0]!.is_correct = true;
    correctCount = 1;
  } else if (correctCount > 1) {
    let kept = false;
    for (const c of choices) {
      if (c.is_correct && !kept) {
        kept = true;
      } else {
        c.is_correct = false;
      }
    }
  }

  let difficulty: QuizDifficulty | undefined;
  if (settings.pool_counts) {
    difficulty =
      normalizeQuizDifficulty(o.difficulty ?? o.schwierigkeit ?? o.level) ??
      normalizeQuizDifficulty(o.difficulty_level) ??
      "medium";
  }

  return difficulty ? { prompt, difficulty, choices } : { prompt, choices };
}

/** Normalisiert typische Gemini-Abweichungen (deutsche Labels, Strings als Boolean, verschachteltes JSON). */
export function normalizeGeneratedQuizPayload(
  payload: unknown,
  settings: QuizSettings,
): GeneratedQuizPayload | null {
  const rawQuestions = extractQuestionsArray(payload);
  if (!rawQuestions || rawQuestions.length === 0) return null;

  const questions: GeneratedQuizPayload["questions"] = [];
  for (let i = 0; i < rawQuestions.length; i += 1) {
    const q = normalizeQuestion(rawQuestions[i], settings, i);
    if (!q) return null;
    questions.push(q);
  }

  return { questions };
}

export function describeGeneratedQuizPayloadErrors(
  payload: unknown,
  settings: QuizSettings,
): string[] {
  const errors: string[] = [];
  const rawQuestions = extractQuestionsArray(payload);

  if (!rawQuestions || rawQuestions.length === 0) {
    errors.push("Kein questions-Array in der KI-Antwort gefunden.");
    return errors;
  }

  if (settings.pool_counts) {
    const expectedTotal = totalDifficultyCounts(settings.pool_counts);
    if (!isWithinTolerance(rawQuestions.length, expectedTotal)) {
      errors.push(
        `Fragenanzahl gesamt: ${rawQuestions.length} (erwartet ca. ${expectedTotal}, Toleranz ±2).`,
      );
    }

    const normalized = normalizeGeneratedQuizPayload(payload, settings);
    if (normalized) {
      const actualCounts = countQuestionsByDifficulty(normalized.questions);
      for (const level of EXAM_DIFFICULTY_ORDER) {
        const expected = settings.pool_counts[level];
        if (!isWithinTolerance(actualCounts[level], expected)) {
          errors.push(
            `${level}: ${actualCounts[level]} Fragen (erwartet ca. ${expected}, Toleranz ±2).`,
          );
        }
      }
    } else {
      errors.push("Mindestens eine Frage konnte nicht normalisiert werden (Prompt/Antworten).");
    }
  } else {
    const expected = settings.question_count ?? 0;
    if (!isWithinTolerance(rawQuestions.length, expected)) {
      errors.push(
        `Fragenanzahl: ${rawQuestions.length} (erwartet ca. ${expected}, Toleranz ±2).`,
      );
    }
  }

  rawQuestions.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      errors.push(`Frage ${index + 1}: kein Objekt.`);
      return;
    }
    const o = raw as Record<string, unknown>;
    if (!readStringField(o, ["prompt", "question", "text", "frage"])) {
      errors.push(`Frage ${index + 1}: fehlender Fragetext.`);
    }

    if (settings.pool_counts) {
      const d = normalizeQuizDifficulty(o.difficulty ?? o.schwierigkeit ?? o.level);
      if (!d) {
        errors.push(
          `Frage ${index + 1}: difficulty "${String(o.difficulty ?? o.schwierigkeit ?? "")}" ungültig (easy/medium/hard).`,
        );
      }
    }

    const choicesRaw = o.choices ?? o.options ?? o.answers ?? o.antworten;
    if (!Array.isArray(choicesRaw)) {
      errors.push(`Frage ${index + 1}: choices fehlen.`);
      return;
    }
    if (choicesRaw.length !== settings.choice_count) {
      errors.push(
        `Frage ${index + 1}: ${choicesRaw.length} Antworten (erwartet ${settings.choice_count}).`,
      );
    }

    let correctCount = 0;
    for (const c of choicesRaw) {
      if (typeof c === "object" && c !== null) {
        const co = c as Record<string, unknown>;
        if (parseTruthyBoolean(co.is_correct ?? co.isCorrect ?? co.correct)) {
          correctCount += 1;
        }
      }
    }
    if (correctCount !== 1) {
      errors.push(`Frage ${index + 1}: ${correctCount} richtige Antworten (erwartet 1).`);
    }
  });

  return [...new Set(errors)];
}
