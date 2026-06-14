import type { GeneratedQuizPayload, QuizQuestionWithChoices, QuizSettings } from "@/lib/server/quiz-types";

export const COURSE_ID = "33333333-3333-4333-8333-333333333333";
export const QUIZ_ID = "44444444-4444-4444-8444-444444444444";
export const QUESTION_ID = "55555555-5555-4555-8555-555555555555";
export const CHOICE_ID = "66666666-6666-4666-8666-666666666666";
export const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
export const STUDENT_ID = "22222222-2222-4222-8222-222222222222";

export const baseSettings: QuizSettings = {
  question_count: 5,
  choice_count: 4,
  difficulty: "medium",
};

export function makeChoices(count: number, correctIndex = 0) {
  return Array.from({ length: count }, (_, i) => ({
    text: `Antwort ${String.fromCharCode(65 + i)}`,
    is_correct: i === correctIndex,
  }));
}

export function makeGeneratedPayload(
  questionCount: number,
  choiceCount: number,
): GeneratedQuizPayload {
  return {
    questions: Array.from({ length: questionCount }, (_, qi) => ({
      prompt: `Frage ${qi + 1}?`,
      choices: makeChoices(choiceCount),
    })),
  };
}

export function makeQuestion(
  prompt: string,
  choices: { text: string; is_correct: boolean }[],
  overrides: Partial<QuizQuestionWithChoices> = {},
): QuizQuestionWithChoices {
  const id = overrides.id ?? QUESTION_ID;
  return {
    id,
    quiz_id: QUIZ_ID,
    prompt,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    choices: choices.map((c, i) => ({
      id: `choice-${i}`,
      question_id: id,
      text: c.text,
      is_correct: c.is_correct,
      sort_order: i,
    })),
    ...overrides,
  };
}
