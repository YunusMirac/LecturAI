import type {
  DifficultyCounts,
  ExamConfig,
  GeneratedQuizPayload,
  QuizDifficulty,
  QuizQuestionWithChoices,
  QuizSettings,
} from "@/lib/server/quiz-types";

export const COURSE_ID = "33333333-3333-4333-8333-333333333333";
export const QUIZ_ID = "44444444-4444-4444-8444-444444444444";
export const QUESTION_ID = "55555555-5555-4555-8555-555555555555";
export const CHOICE_ID = "66666666-6666-4666-8666-666666666666";
export const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
export const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
export const ATTEMPT_ID = "77777777-7777-4777-8777-777777777777";

export const baseSettings: QuizSettings = {
  question_count: 5,
  choice_count: 4,
  difficulty: "medium",
};

export const poolSettings: QuizSettings = {
  choice_count: 4,
  pool_counts: { easy: 2, medium: 2, hard: 1 },
  question_count: 5,
};

export const baseExamConfig: ExamConfig = {
  duration_seconds: 3600,
  draw_counts: { easy: 1, medium: 1, hard: 1 },
};

export { seededRng } from "@/lib/server/quiz-exam-draw";

export function makeExamConfig(overrides: Partial<ExamConfig> = {}): ExamConfig {
  return {
    duration_seconds: overrides.duration_seconds ?? 1800,
    draw_counts: {
      ...baseExamConfig.draw_counts,
      ...overrides.draw_counts,
    },
  };
}

export function makeChoices(count: number, correctIndex = 0) {
  return Array.from({ length: count }, (_, i) => ({
    text: `Antwort ${String.fromCharCode(65 + i)}`,
    is_correct: i === correctIndex,
  }));
}

export function makeGeneratedPayload(
  questionCount: number,
  choiceCount: number,
  difficulty: QuizDifficulty = "medium",
): GeneratedQuizPayload {
  return {
    questions: Array.from({ length: questionCount }, (_, qi) => ({
      prompt: `Frage ${qi + 1}?`,
      difficulty,
      choices: makeChoices(choiceCount),
    })),
  };
}

export function makePoolGeneratedPayload(counts: DifficultyCounts, choiceCount: number): GeneratedQuizPayload {
  const questions: GeneratedQuizPayload["questions"] = [];
  for (const level of ["easy", "medium", "hard"] as const) {
    for (let i = 0; i < counts[level]; i += 1) {
      questions.push({
        prompt: `${level} Frage ${i + 1}?`,
        difficulty: level,
        choices: makeChoices(choiceCount),
      });
    }
  }
  return { questions };
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
    sort_order: overrides.sort_order ?? 0,
    difficulty: overrides.difficulty ?? "medium",
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

export function makePoolQuestions(counts: DifficultyCounts): QuizQuestionWithChoices[] {
  const questions: QuizQuestionWithChoices[] = [];
  let order = 0;
  for (const level of ["easy", "medium", "hard"] as const) {
    for (let i = 0; i < counts[level]; i += 1) {
      questions.push(
        makeQuestion(`${level} ${i + 1}?`, makeChoices(4), {
          id: `${level}-${i}`,
          difficulty: level,
          sort_order: order,
        }),
      );
      order += 1;
    }
  }
  return questions;
}

export function makeAttemptQuestionSnapshot(
  attemptId: string,
  orderedQuestionIds: string[],
) {
  return orderedQuestionIds.map((question_id, sort_order) => ({
    attempt_id: attemptId,
    question_id,
    sort_order,
  }));
}
