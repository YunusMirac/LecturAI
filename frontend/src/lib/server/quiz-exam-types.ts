export type ExamSubmitReason = "in_progress" | "manual" | "timeout";

export type ExamQuestionView = {
  id: string;
  prompt: string;
  sort_order: number;
  choices: { id: string; text: string; sort_order: number }[];
};

export type ExamAttemptState = {
  attempt_id: string;
  quiz_id: string;
  title: string;
  status: "in_progress" | "submitted";
  submit_reason: ExamSubmitReason | null;
  started_at: string;
  submitted_at: string | null;
  seconds_remaining: number;
  duration_seconds: number;
  current_index: number;
  question_count: number;
  questions: ExamQuestionView[];
  answers: Record<string, string | null>;
};

export type ExamResultSummary = {
  attempt_id: string;
  user_id: string;
  display_email: string;
  started_at: string;
  submitted_at: string | null;
  submit_reason: ExamSubmitReason | null;
  correct_count: number | null;
  total_count: number | null;
  percent_correct: number | null;
  in_progress: boolean;
};

export type ExamResultDetail = ExamResultSummary & {
  questions: {
    question_id: string;
    prompt: string;
    sort_order: number;
    choice_id: string | null;
    choice_text: string | null;
    is_correct: boolean | null;
    correct_choice_id: string;
    correct_choice_text: string;
  }[];
};
