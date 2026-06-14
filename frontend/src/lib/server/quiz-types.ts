export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizType = "live" | "exam";

export type QuizStatus = "generating" | "draft" | "published" | "failed";

export type QuizSettings = {
  question_count: number;
  choice_count: number;
  difficulty: QuizDifficulty;
};

export type QuizRow = {
  id: string;
  course_id: string;
  title: string;
  status: QuizStatus;
  quiz_type?: QuizType;
  settings_json: QuizSettings;
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
  choices: GeneratedChoice[];
};

export type GeneratedQuizPayload = {
  questions: GeneratedQuestion[];
};
