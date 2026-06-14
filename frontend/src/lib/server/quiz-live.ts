import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ChoiceStat,
  LiveHostState,
  LiveLeaderboardEntry,
  LiveParticipant,
  LivePlayState,
  LiveQuestionView,
  LiveQuizRow,
  LiveStatus,
} from "@/lib/server/quiz-live-types";
import { loadQuizDetail } from "@/lib/server/quiz-db";
import type { QuizQuestionWithChoices } from "@/lib/server/quiz-types";
import {
  QUESTION_SECONDS,
  REVEAL_SECONDS_FAST,
  REVEAL_SECONDS_SLOW,
} from "@/lib/quiz-live-constants";

export { QUESTION_SECONDS, REVEAL_SECONDS_FAST, REVEAL_SECONDS_SLOW };

export function computeSecondsRemaining(
  startedAt: string | null,
  durationSec: number,
  now = Date.now(),
): number | null {
  if (!startedAt) return null;
  const elapsed = (now - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(durationSec - elapsed));
}

export function computeRevealDurationSeconds(allAnswered: boolean): number {
  return allAnswered ? REVEAL_SECONDS_FAST : REVEAL_SECONDS_SLOW;
}

export function computePoints(
  isCorrect: boolean,
  answeredAt: Date,
  questionStartedAt: string,
  secondsPerQuestion: number = QUESTION_SECONDS,
): number {
  if (!isCorrect) return 0;
  const elapsed = (answeredAt.getTime() - new Date(questionStartedAt).getTime()) / 1000;
  const remaining = Math.max(0, secondsPerQuestion - elapsed);
  return Math.round(500 + (remaining / secondsPerQuestion) * 500);
}

function sortQuestions(detail: Awaited<ReturnType<typeof loadQuizDetail>>) {
  return [...(detail?.questions ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

function toQuestionView(
  question: QuizQuestionWithChoices,
  revealCorrect: boolean,
): LiveQuestionView {
  return {
    id: question.id,
    prompt: question.prompt,
    sort_order: question.sort_order,
    choices: [...question.choices]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        text: c.text,
        sort_order: c.sort_order,
        ...(revealCorrect ? { is_correct: c.is_correct } : {}),
      })),
  };
}

function getCorrectChoiceId(question: QuizQuestionWithChoices): string | null {
  return question.choices.find((c) => c.is_correct)?.id ?? null;
}

export async function loadParticipants(
  admin: SupabaseClient,
  quizId: string,
): Promise<LiveParticipant[]> {
  const { data } = await admin
    .from("quiz_live_participants")
    .select("id, user_id, display_email, total_score, joined_at")
    .eq("quiz_id", quizId)
    .order("joined_at", { ascending: true });
  return (data ?? []) as LiveParticipant[];
}

export async function buildLeaderboard(
  admin: SupabaseClient,
  quizId: string,
): Promise<LiveLeaderboardEntry[]> {
  const { data } = await admin
    .from("quiz_live_participants")
    .select("user_id, display_email, total_score")
    .eq("quiz_id", quizId)
    .order("total_score", { ascending: false })
    .order("joined_at", { ascending: true });

  return (data ?? []).map((row, index) => ({
    user_id: (row as LiveParticipant).user_id,
    display_email: (row as LiveParticipant).display_email,
    total_score: (row as LiveParticipant).total_score,
    rank: index + 1,
  }));
}

export function getTopThree(leaderboard: LiveLeaderboardEntry[]): LiveLeaderboardEntry[] {
  return leaderboard.slice(0, 3);
}

export async function countAnswersForQuestion(
  admin: SupabaseClient,
  quizId: string,
  questionId: string,
): Promise<number> {
  const { count } = await admin
    .from("quiz_live_answers")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId)
    .eq("question_id", questionId);
  return count ?? 0;
}

export async function buildChoiceStats(
  admin: SupabaseClient,
  quizId: string,
  question: QuizQuestionWithChoices,
  revealCorrect: boolean,
): Promise<ChoiceStat[]> {
  const { data: answers } = await admin
    .from("quiz_live_answers")
    .select("choice_id")
    .eq("quiz_id", quizId)
    .eq("question_id", question.id);

  const counts = new Map<string, number>();
  for (const row of answers ?? []) {
    const id = String((row as { choice_id: string }).choice_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return [...question.choices]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      choice_id: c.id,
      text: c.text,
      count: counts.get(c.id) ?? 0,
      ...(revealCorrect ? { is_correct: c.is_correct } : {}),
    }));
}

/** Automatischer Übergang question → reveal → nächste Frage / finished */
export async function maybeAdvanceLiveQuiz(
  admin: SupabaseClient,
  quiz: LiveQuizRow,
  participantCount: number,
  questionCount: number,
): Promise<LiveQuizRow> {
  const now = new Date();

  if (quiz.live_status === "question" && quiz.question_started_at && questionCount > 0) {
    const elapsed =
      (now.getTime() - new Date(quiz.question_started_at).getTime()) / 1000;
    const questions = await admin
      .from("quiz_questions")
      .select("id")
      .eq("quiz_id", quiz.id)
      .order("sort_order", { ascending: true });
    const qList = questions.data ?? [];
    const currentQ = qList[quiz.current_question_index] as { id: string } | undefined;

    let allAnswered = false;
    if (currentQ && participantCount > 0) {
      const answered = await countAnswersForQuestion(admin, quiz.id, currentQ.id);
      allAnswered = answered >= participantCount;
    }

    const timedOut = elapsed >= QUESTION_SECONDS;
    if (timedOut || allAnswered) {
      const revealMs = computeRevealDurationSeconds(allAnswered) * 1000;
      const revealEnds = new Date(now.getTime() + revealMs);
      const { data } = await admin
        .from("quizzes")
        .update({
          live_status: "reveal",
          reveal_ends_at: revealEnds.toISOString(),
        })
        .eq("id", quiz.id)
        .select(
          "id, course_id, title, status, access_code, live_open, live_status, current_question_index, question_started_at, reveal_ends_at, seconds_per_question",
        )
        .single();
      return (data ?? quiz) as LiveQuizRow;
    }
  }

  if (quiz.live_status === "reveal" && quiz.reveal_ends_at) {
    if (now.getTime() >= new Date(quiz.reveal_ends_at).getTime()) {
      const nextIndex = quiz.current_question_index + 1;
      if (nextIndex >= questionCount) {
        const { data } = await admin
          .from("quizzes")
          .update({ live_status: "finished", reveal_ends_at: null })
          .eq("id", quiz.id)
          .select(
            "id, course_id, title, status, access_code, live_open, live_status, current_question_index, question_started_at, reveal_ends_at, seconds_per_question",
          )
          .single();
        return (data ?? quiz) as LiveQuizRow;
      }

      const { data } = await admin
        .from("quizzes")
        .update({
          live_status: "question",
          current_question_index: nextIndex,
          question_started_at: now.toISOString(),
          reveal_ends_at: null,
        })
        .eq("id", quiz.id)
        .select(
          "id, course_id, title, status, access_code, live_open, live_status, current_question_index, question_started_at, reveal_ends_at, seconds_per_question",
        )
        .single();
      return (data ?? quiz) as LiveQuizRow;
    }
  }

  return quiz;
}

export async function fetchLiveQuizRow(
  admin: SupabaseClient,
  quizId: string,
): Promise<LiveQuizRow | null> {
  const { data } = await admin
    .from("quizzes")
    .select(
      "id, course_id, title, status, access_code, live_open, live_status, current_question_index, question_started_at, reveal_ends_at, seconds_per_question",
    )
    .eq("id", quizId)
    .maybeSingle();
  return data as LiveQuizRow | null;
}

function revealSecondsRemaining(revealEndsAt: string | null): number | null {
  if (!revealEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(revealEndsAt).getTime() - Date.now()) / 1000));
}

async function buildRevealExtras(
  admin: SupabaseClient,
  quizId: string,
  currentQuestion: QuizQuestionWithChoices | null,
) {
  const fullBoard = await buildLeaderboard(admin, quizId);
  const top_three = getTopThree(fullBoard);
  const choice_stats =
    currentQuestion != null
      ? await buildChoiceStats(admin, quizId, currentQuestion, true)
      : [];
  return { top_three, choice_stats, leaderboard: fullBoard };
}

export async function buildLivePlayState(
  admin: SupabaseClient,
  quiz: LiveQuizRow,
  userId: string,
): Promise<LivePlayState | null> {
  const detail = await loadQuizDetail(admin, quiz.id);
  if (!detail) return null;

  const sorted = sortQuestions(detail);
  const participants = await loadParticipants(admin, quiz.id);
  const participantCount = participants.length;

  await maybeAdvanceLiveQuiz(admin, quiz, participantCount, sorted.length);
  const live = (await fetchLiveQuizRow(admin, quiz.id)) ?? quiz;

  const idx = live.current_question_index;
  const currentQuestion = sorted[idx] ?? null;
  const isReveal = live.live_status === "reveal";
  const isFinished = live.live_status === "finished";
  const revealCorrect = isReveal || isFinished;

  let myChoiceId: string | null = null;
  let answeredCount = 0;
  if (currentQuestion) {
    answeredCount = await countAnswersForQuestion(admin, live.id, currentQuestion.id);
    const { data: ans } = await admin
      .from("quiz_live_answers")
      .select("choice_id")
      .eq("quiz_id", live.id)
      .eq("question_id", currentQuestion.id)
      .eq("user_id", userId)
      .maybeSingle();
    myChoiceId = ans ? String((ans as { choice_id: string }).choice_id) : null;
  }

  const allAnswered =
    participantCount > 0 && currentQuestion != null && answeredCount >= participantCount;

  let leaderboard: LiveLeaderboardEntry[] = [];
  let top_three: LiveLeaderboardEntry[] = [];
  let choice_stats: ChoiceStat[] = [];

  if (isFinished) {
    leaderboard = await buildLeaderboard(admin, live.id);
  } else if (isReveal && currentQuestion) {
    const extras = await buildRevealExtras(admin, live.id, currentQuestion);
    top_three = extras.top_three;
    choice_stats = extras.choice_stats;
  }

  return {
    quiz_id: live.id,
    title: live.title,
    live_status: live.live_status as LiveStatus,
    current_question_index: idx,
    total_questions: sorted.length,
    seconds_per_question: QUESTION_SECONDS,
    question_started_at: live.question_started_at,
    reveal_ends_at: live.reveal_ends_at,
    seconds_remaining:
      live.live_status === "question"
        ? computeSecondsRemaining(live.question_started_at, QUESTION_SECONDS)
        : null,
    reveal_seconds_remaining: isReveal ? revealSecondsRemaining(live.reveal_ends_at) : null,
    question: currentQuestion ? toQuestionView(currentQuestion, revealCorrect) : null,
    my_choice_id: myChoiceId,
    correct_choice_id:
      revealCorrect && currentQuestion ? getCorrectChoiceId(currentQuestion) : null,
    leaderboard,
    top_three,
    choice_stats,
    all_answered_current: allAnswered,
    answered_count: answeredCount,
    participants_waiting: participantCount,
  };
}

export async function buildLiveHostState(
  admin: SupabaseClient,
  quiz: LiveQuizRow,
): Promise<LiveHostState | null> {
  const detail = await loadQuizDetail(admin, quiz.id);
  if (!detail) return null;

  const sorted = sortQuestions(detail);
  const participants = await loadParticipants(admin, quiz.id);
  const participantCount = participants.length;

  await maybeAdvanceLiveQuiz(admin, quiz, participantCount, sorted.length);
  const live = (await fetchLiveQuizRow(admin, quiz.id)) ?? quiz;

  const idx = live.current_question_index;
  const currentQuestion = sorted[idx] ?? null;
  const isReveal = live.live_status === "reveal";
  const isFinished = live.live_status === "finished";
  const showCorrect = isReveal || isFinished;

  let answeredCount = 0;
  if (currentQuestion && live.live_status === "question") {
    answeredCount = await countAnswersForQuestion(admin, live.id, currentQuestion.id);
  }

  const allAnswered =
    participantCount > 0 && currentQuestion != null && answeredCount >= participantCount;

  let leaderboard: LiveLeaderboardEntry[] = [];
  let top_three: LiveLeaderboardEntry[] = [];
  let choice_stats: ChoiceStat[] = [];

  if (isFinished) {
    leaderboard = await buildLeaderboard(admin, live.id);
  } else if (isReveal && currentQuestion) {
    const extras = await buildRevealExtras(admin, live.id, currentQuestion);
    top_three = extras.top_three;
    choice_stats = extras.choice_stats;
  }

  return {
    quiz_id: live.id,
    title: live.title,
    access_code: live.access_code,
    live_open: live.live_open,
    live_status: live.live_status as LiveStatus,
    current_question_index: idx,
    total_questions: sorted.length,
    seconds_per_question: QUESTION_SECONDS,
    question_started_at: live.question_started_at,
    reveal_ends_at: live.reveal_ends_at,
    seconds_remaining:
      live.live_status === "question"
        ? computeSecondsRemaining(live.question_started_at, QUESTION_SECONDS)
        : null,
    reveal_seconds_remaining: isReveal ? revealSecondsRemaining(live.reveal_ends_at) : null,
    participants,
    answered_count: answeredCount,
    question: currentQuestion ? toQuestionView(currentQuestion, showCorrect) : null,
    correct_choice_id:
      showCorrect && currentQuestion ? getCorrectChoiceId(currentQuestion) : null,
    leaderboard,
    top_three,
    choice_stats,
    all_answered_current: allAnswered,
  };
}
