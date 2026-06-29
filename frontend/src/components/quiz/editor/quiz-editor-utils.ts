import type { QuizQuestion } from "@/lib/api/quizzesApi";
import type { QuizDifficulty } from "@/lib/quiz/domain";
import { EXAM_DIFFICULTY_ORDER } from "@/lib/quiz/domain";

export { EXAM_DIFFICULTY_ORDER };

export const EMPTY_CHOICES = [
  { text: "", is_correct: true },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
];

export type ChoiceDraft = { text: string; is_correct: boolean };

export type SectionFormState = {
  prompt: string;
  choices: ChoiceDraft[];
  adding: boolean;
};

export function emptyAddFormState(): Record<QuizDifficulty, SectionFormState> {
  const blank = (): SectionFormState => ({
    prompt: "",
    choices: EMPTY_CHOICES.map((c) => ({ ...c })),
    adding: false,
  });
  return { easy: blank(), medium: blank(), hard: blank() };
}

export function sortQuestions(questions: QuizQuestion[]) {
  return [...questions].sort((a, b) => a.sort_order - b.sort_order);
}

export function sortChoices(question: QuizQuestion) {
  return [...question.choices].sort((a, b) => a.sort_order - b.sort_order);
}

export function groupQuestionsByDifficulty(
  questions: QuizQuestion[],
): Record<QuizDifficulty, QuizQuestion[]> {
  const groups: Record<QuizDifficulty, QuizQuestion[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const q of sortQuestions(questions)) {
    const level = q.difficulty ?? "medium";
    if (level === "easy" || level === "medium" || level === "hard") {
      groups[level].push(q);
    } else {
      groups.medium.push(q);
    }
  }
  return groups;
}
