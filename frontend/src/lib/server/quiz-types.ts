export type {
  DifficultyCounts,
  QuizDifficulty,
  QuizStatus,
  QuizType,
} from "@/lib/quiz/domain";
export {
  emptyDifficultyCounts,
  totalDifficultyCounts,
} from "@/lib/quiz/domain";

import type { DifficultyCounts, QuizDifficulty, QuizStatus, QuizType } from "@/lib/quiz/domain";

export type QuizSettings = {
  choice_count: number;
  /** Legacy: Live-Quiz und alte Klausuren */
  question_count?: number;
  difficulty?: QuizDifficulty;
  /** Exam-Pool: Anzahl Fragen pro Schwierigkeit */
  pool_counts?: DifficultyCounts;
};

export type ExamConfig = {
  duration_seconds: number;
  draw_counts: DifficultyCounts;
};

export type QuizRow = {
  id: string;
  course_id: string;
  title: string;
  status: QuizStatus;
  quiz_type?: QuizType;
  settings_json: QuizSettings;
  exam_config_json?: ExamConfig | null;
  source_pdf_path: string | null;
  generation_error: string | null;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuizChoiceRow = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
};

export type QuizQuestionRow = {
  id: string;
  quiz_id: string;
  prompt: string;
  sort_order: number;
  difficulty: QuizDifficulty;
  created_at: string;
};

export type QuizQuestionWithChoices = QuizQuestionRow & {
  choices: QuizChoiceRow[];
};

export type QuizDetail = QuizRow & {
  questions: QuizQuestionWithChoices[];
};

export type GeneratedChoice = {
  text: string;
  is_correct: boolean;
};

export type GeneratedQuestion = {
  prompt: string;
  difficulty?: QuizDifficulty;
  choices: GeneratedChoice[];
};

export type GeneratedQuizPayload = {
  questions: GeneratedQuestion[];
};

export type AttemptQuestionSnapshot = {
  question_id: string;
  sort_order: number;
};
