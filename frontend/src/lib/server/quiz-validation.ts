import type {
  GeneratedQuizPayload,
  QuizQuestionWithChoices,
  QuizSettings,
} from "@/lib/server/quiz-types";
import {
  MAX_CHOICES,
  MAX_QUESTIONS,
  MIN_CHOICES,
  MIN_QUESTIONS,
} from "@/lib/quiz-labels";

export { MAX_CHOICES, MAX_QUESTIONS, MIN_CHOICES, MIN_QUESTIONS };

export function parseQuizSettings(raw: unknown): QuizSettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const question_count = Number(o.question_count);
  const choice_count = Number(o.choice_count);
  const difficulty = o.difficulty;
  if (
    !Number.isInteger(question_count) ||
    !Number.isInteger(choice_count) ||
    (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard")
  ) {
    return null;
  }
  return { question_count, choice_count, difficulty };
}

export function validateCreateQuizSettings(settings: QuizSettings):
  | { ok: true }
  | { status: 400; body: Record<string, string[]> } {
  if (settings.question_count < MIN_QUESTIONS || settings.question_count > MAX_QUESTIONS) {
    return {
      status: 400,
      body: {
        question_count: [`Anzahl Fragen muss zwischen ${MIN_QUESTIONS} und ${MAX_QUESTIONS} liegen.`],
      },
    };
  }
  if (settings.choice_count < MIN_CHOICES || settings.choice_count > MAX_CHOICES) {
    return {
      status: 400,
      body: {
        choice_count: [`Anzahl Antworten muss zwischen ${MIN_CHOICES} und ${MAX_CHOICES} liegen.`],
      },
    };
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

  const expected = settings.question_count;
  if (questions.length < Math.max(1, expected - 2) || questions.length > expected + 2) {
    return false;
  }

  for (const q of questions) {
    if (typeof q.prompt !== "string" || !q.prompt.trim()) return false;
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
