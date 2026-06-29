import type {
  DifficultyCounts,
  ExamConfig,
  GeneratedQuizPayload,
  QuizQuestionWithChoices,
  QuizSettings,
} from "@/lib/server/quiz-types";
import {
  emptyDifficultyCounts,
  totalDifficultyCounts,
} from "@/lib/server/quiz-types";
import {
  MAX_CHOICES,
  MAX_EXAM_DURATION_SECONDS,
  MAX_POOL_PER_DIFFICULTY,
  MAX_POOL_TOTAL,
  MAX_QUESTIONS,
  MIN_CHOICES,
  MIN_EXAM_DURATION_SECONDS,
  MIN_POOL_TOTAL,
  MIN_QUESTIONS,
} from "@/lib/quiz-labels";

import {
  countQuestionsByDifficulty,
  DIFFICULTIES,
  isWithinTolerance,
} from "@/lib/server/quiz-validation-normalize";

export function validateCreateQuizSettings(settings: QuizSettings):
  | { ok: true }
  | { status: 400; body: Record<string, string[]> } {
  if (settings.choice_count < MIN_CHOICES || settings.choice_count > MAX_CHOICES) {
    return {
      status: 400,
      body: {
        choice_count: [`Anzahl Antworten muss zwischen ${MIN_CHOICES} und ${MAX_CHOICES} liegen.`],
      },
    };
  }

  if (settings.pool_counts) {
    const { easy, medium, hard } = settings.pool_counts;
    const total = totalDifficultyCounts(settings.pool_counts);
    const errors: Record<string, string[]> = {};

    for (const [key, value] of Object.entries({ easy, medium, hard })) {
      if (value < 0 || value > MAX_POOL_PER_DIFFICULTY) {
        errors[`pool_${key}`] = [
          `Anzahl ${key} muss zwischen 0 und ${MAX_POOL_PER_DIFFICULTY} liegen.`,
        ];
      }
    }
    if (total < MIN_POOL_TOTAL) {
      errors.pool_total = [`Der Pool braucht mindestens ${MIN_POOL_TOTAL} Fragen gesamt.`];
    }
    if (total > MAX_POOL_TOTAL) {
      errors.pool_total = [`Der Pool darf höchstens ${MAX_POOL_TOTAL} Fragen haben.`];
    }
    if (Object.keys(errors).length > 0) {
      return { status: 400, body: errors };
    }
    return { ok: true };
  }

  const question_count = settings.question_count ?? 0;
  if (question_count < MIN_QUESTIONS || question_count > MAX_QUESTIONS) {
    return {
      status: 400,
      body: {
        question_count: [`Anzahl Fragen muss zwischen ${MIN_QUESTIONS} und ${MAX_QUESTIONS} liegen.`],
      },
    };
  }
  return { ok: true };
}

export function validateExamConfig(
  poolCounts: DifficultyCounts,
  drawCounts: DifficultyCounts,
  durationSeconds: number,
): { ok: true } | { ok: false; body: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  if (durationSeconds < MIN_EXAM_DURATION_SECONDS || durationSeconds > MAX_EXAM_DURATION_SECONDS) {
    errors.duration_minutes = [
      `Zeitlimit muss zwischen ${MIN_EXAM_DURATION_SECONDS / 60} und ${MAX_EXAM_DURATION_SECONDS / 60} Minuten liegen.`,
    ];
  }

  const drawTotal = totalDifficultyCounts(drawCounts);
  if (drawTotal < 1) {
    errors.draw_total = ["Die Klausur braucht mindestens eine Frage."];
  }

  for (const level of DIFFICULTIES) {
    if (drawCounts[level] < 0) {
      errors[`draw_${level}`] = ["Anzahl darf nicht negativ sein."];
    } else if (drawCounts[level] > poolCounts[level]) {
      errors[`draw_${level}`] = [
        `Es sind nur ${poolCounts[level]} ${level === "easy" ? "leichte" : level === "medium" ? "mittlere" : "schwere"} Fragen im Pool.`,
      ];
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, body: errors };
  }
  return { ok: true };
}

export function validateGeneratedQuizPayload(
  payload: unknown,
  settings: QuizSettings,
): payload is GeneratedQuizPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const questions = (payload as GeneratedQuizPayload).questions;
  if (!Array.isArray(questions) || questions.length === 0) return false;

  if (settings.pool_counts) {
    const expectedTotal = totalDifficultyCounts(settings.pool_counts);
    if (!isWithinTolerance(questions.length, expectedTotal)) return false;

    const actualCounts = countQuestionsByDifficulty(questions);
    for (const level of DIFFICULTIES) {
      if (!isWithinTolerance(actualCounts[level], settings.pool_counts[level])) {
        return false;
      }
    }
  } else {
    const expected = settings.question_count ?? 0;
    if (!isWithinTolerance(questions.length, expected)) return false;
  }

  for (const q of questions) {
    if (typeof q.prompt !== "string" || !q.prompt.trim()) return false;
    if (settings.pool_counts) {
      if (q.difficulty !== "easy" && q.difficulty !== "medium" && q.difficulty !== "hard") {
        return false;
      }
    }
    if (!Array.isArray(q.choices) || q.choices.length !== settings.choice_count) return false;
    let correctCount = 0;
    for (const c of q.choices) {
      if (typeof c.text !== "string" || !c.text.trim()) return false;
      if (c.is_correct === true) correctCount += 1;
    }
    if (correctCount !== 1) return false;
  }
  return true;
}

export function countQuestionsInPool(questions: QuizQuestionWithChoices[]): DifficultyCounts {
  const counts = emptyDifficultyCounts();
  for (const q of questions) {
    const d = q.difficulty ?? "medium";
    if (d === "easy" || d === "medium" || d === "hard") {
      counts[d] += 1;
    }
  }
  return counts;
}

export function validateQuestionForPublish(question: QuizQuestionWithChoices):
  | { ok: true }
  | { ok: false; message: string } {
  if (!question.prompt.trim()) {
    return { ok: false, message: "Jede Frage braucht einen Fragetext." };
  }
  if (question.choices.length < MIN_CHOICES) {
    return { ok: false, message: "Jede Frage braucht mindestens zwei Antworten." };
  }
  const correct = question.choices.filter((c) => c.is_correct);
  if (correct.length !== 1) {
    return { ok: false, message: "Jede Frage braucht genau eine richtige Antwort." };
  }
  for (const c of question.choices) {
    if (!c.text.trim()) {
      return { ok: false, message: "Antworttexte dürfen nicht leer sein." };
    }
  }
  return { ok: true };
}

export function validateQuizForPublish(questions: QuizQuestionWithChoices[]):
  | { ok: true }
  | { ok: false; message: string } {
  if (questions.length === 0) {
    return { ok: false, message: "Mindestens eine Frage ist nötig zum Veröffentlichen." };
  }
  for (const q of questions) {
    const r = validateQuestionForPublish(q);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export function buildLegacyDrawCounts(poolCounts: DifficultyCounts): DifficultyCounts {
  return { ...poolCounts };
}

export function resolveEffectiveDrawCounts(
  examConfig: ExamConfig | null | undefined,
  poolCounts: DifficultyCounts,
  totalQuestions: number,
): DifficultyCounts {
  if (examConfig?.draw_counts) {
    return examConfig.draw_counts;
  }
  if (totalQuestions > 0 && totalDifficultyCounts(poolCounts) === totalQuestions) {
    return buildLegacyDrawCounts(poolCounts);
  }
  return {
    easy: poolCounts.easy,
    medium: poolCounts.medium,
    hard: poolCounts.hard,
  };
}
