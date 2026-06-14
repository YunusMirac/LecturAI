export type LiveStatus = "idle" | "lobby" | "question" | "reveal" | "finished" | "closed";

export type LiveQuizRow = {
  id: string;
  course_id: string;
  title: string;
  status: string;
  access_code: string | null;
  live_open: boolean;
  live_status: LiveStatus;
  current_question_index: number;
  question_started_at: string | null;
  reveal_ends_at: string | null;
  seconds_per_question: number;
};

export type LiveParticipant = {
  id: string;
  user_id: string;
  display_email: string;
  total_score: number;
  joined_at: string;
};

export type LiveLeaderboardEntry = {
  user_id: string;
  display_email: string;
  total_score: number;
  rank: number;
};

export type ChoiceStat = {
  choice_id: string;
  text: string;
  count: number;
  is_correct?: boolean;
};

export type LiveQuestionView = {
  id: string;
  prompt: string;
  sort_order: number;
  choices: { id: string; text: string; sort_order: number; is_correct?: boolean }[];
};

export type LivePlayState = {
  quiz_id: string;
  title: string;
  live_status: LiveStatus;
  current_question_index: number;
  total_questions: number;
  seconds_per_question: number;
  question_started_at: string | null;
  reveal_ends_at: string | null;
  seconds_remaining: number | null;
  reveal_seconds_remaining: number | null;
  question: LiveQuestionView | null;
  my_choice_id: string | null;
  correct_choice_id: string | null;
  leaderboard: LiveLeaderboardEntry[];
  top_three: LiveLeaderboardEntry[];
  choice_stats: ChoiceStat[];
  all_answered_current: boolean;
  answered_count: number;
  participants_waiting: number;
};

export type LiveHostState = {
  quiz_id: string;
  title: string;
  access_code: string | null;
  live_open: boolean;
  live_status: LiveStatus;
  current_question_index: number;
  total_questions: number;
  seconds_per_question: number;
  question_started_at: string | null;
  reveal_ends_at: string | null;
  seconds_remaining: number | null;
  reveal_seconds_remaining: number | null;
  participants: LiveParticipant[];
  answered_count: number;
  question: LiveQuestionView | null;
  correct_choice_id: string | null;
  leaderboard: LiveLeaderboardEntry[];
  top_three: LiveLeaderboardEntry[];
  choice_stats: ChoiceStat[];
  all_answered_current: boolean;
};
