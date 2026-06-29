export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizType = "live" | "exam";

export type QuizStatus = "generating" | "draft" | "published" | "failed";

export type DifficultyCounts = {
  easy: number;
  medium: number;
  hard: number;
};

export function totalDifficultyCounts(counts: DifficultyCounts): number {
  return counts.easy + counts.medium + counts.hard;
}

export function emptyDifficultyCounts(): DifficultyCounts {
  return { easy: 0, medium: 0, hard: 0 };
}

export const EXAM_DIFFICULTY_ORDER: QuizDifficulty[] = ["easy", "medium", "hard"];
