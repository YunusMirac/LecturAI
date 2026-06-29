import type { SupabaseClient } from "@supabase/supabase-js";

import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";
import {
  countQuestionsByDifficulty,
  deleteExamAttempt,
  loadAttemptQuestionSnapshot,
  loadQuizDetail,
  persistAttemptQuestionSnapshot,
} from "@/lib/server/quiz-db";
import {
  buildStudentExamInstance,
  orderQuestionsBySnapshot,
  snapshotQuestionIds,
} from "@/lib/server/quiz-exam-draw";
import type {
  ExamAttemptState,
  ExamQuestionView,
  ExamResultDetail,
  ExamResultSummary,
  ExamSubmitReason,
} from "@/lib/server/quiz-exam-types";
import type { QuizQuestionWithChoices } from "@/lib/server/quiz-types";
import {
  countQuestionsInPool,
  parseExamConfig,
  resolveEffectiveDrawCounts,
  resolveExamDuration,
} from "@/lib/server/quiz-validation";

type AttemptRow = {
  id: string;
  quiz_id: string;
  user_id: string;
  display_email: string;
  started_at: string;
  submitted_at: string | null;
  submit_reason: ExamSubmitReason;
  correct_count: number | null;
  total_count: number | null;
  percent_correct: number | null;
};

export { scoreExamAnswers };

export function computeExamSecondsRemaining(
  startedAt: string,
  now = Date.now(),
  durationSeconds = EXAM_DURATION_SECONDS,
): number {
  const elapsed = (now - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(durationSeconds - elapsed));
}

export function isExamTimedOut(
  startedAt: string,
  now = Date.now(),
  durationSeconds = EXAM_DURATION_SECONDS,
): boolean {
  return computeExamSecondsRemaining(startedAt, now, durationSeconds) <= 0;
}

function stripCorrectFlag(questions: QuizQuestionWithChoices[]): ExamQuestionView[] {
  return questions.map((q, index) => ({
    id: q.id,
    prompt: q.prompt,
    sort_order: index,
    choices: q.choices.map((c) => ({
      id: c.id,
      text: c.text,
      sort_order: c.sort_order,
    })),
  }));
}

function scoreExamAnswers(
  questions: QuizQuestionWithChoices[],
  answers: { question_id: string; choice_id: string | null }[],
): { correct_count: number; total_count: number; percent_correct: number } {
  const total = questions.length;
  let correct = 0;
  for (const q of questions) {
    const answer = answers.find((a) => a.question_id === q.id);
    const correctChoice = q.choices.find((c) => c.is_correct);
    if (answer?.choice_id && correctChoice && answer.choice_id === correctChoice.id) {
      correct += 1;
    }
  }
  const percent = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
  return { correct_count: correct, total_count: total, percent_correct: percent };
}

async function loadAttemptAnswers(
  admin: SupabaseClient,
  attemptId: string,
): Promise<Record<string, string | null>> {
  const { data } = await admin
    .from("quiz_exam_answers")
    .select("question_id, choice_id")
    .eq("attempt_id", attemptId);

  const map: Record<string, string | null> = {};
  for (const row of data ?? []) {
    const r = row as { question_id: string; choice_id: string | null };
    map[r.question_id] = r.choice_id;
  }
  return map;
}

async function resolveAttemptQuestions(
  admin: SupabaseClient,
  quizId: string,
  attemptId: string,
): Promise<QuizQuestionWithChoices[] | null> {
  const detail = await loadQuizDetail(admin, quizId);
  if (!detail) return null;

  const snapshot = await loadAttemptQuestionSnapshot(admin, attemptId);
  if (snapshot.length > 0) {
    return orderQuestionsBySnapshot(detail.questions, snapshot);
  }

  return detail.questions.slice().sort((a, b) => a.sort_order - b.sort_order);
}

async function resolveExamDurationForQuiz(
  admin: SupabaseClient,
  quizId: string,
): Promise<number> {
  const { data } = await admin
    .from("quizzes")
    .select("exam_config_json")
    .eq("id", quizId)
    .maybeSingle();

  const config = parseExamConfig((data as { exam_config_json?: unknown } | null)?.exam_config_json);
  return resolveExamDuration(config);
}

export async function loadExamAttempt(
  admin: SupabaseClient,
  quizId: string,
  userId: string,
): Promise<AttemptRow | null> {
  const { data } = await admin
    .from("quiz_exam_attempts")
    .select(
      "id, quiz_id, user_id, display_email, started_at, submitted_at, submit_reason, correct_count, total_count, percent_correct",
    )
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  return data as AttemptRow | null;
}

export async function buildExamAttemptState(
  admin: SupabaseClient,
  quizId: string,
  attempt: AttemptRow,
  title: string,
): Promise<ExamAttemptState | null> {
  const questions = await resolveAttemptQuestions(admin, quizId, attempt.id);
  if (!questions) return null;

  const durationSeconds = await resolveExamDurationForQuiz(admin, quizId);
  const submitted = attempt.submit_reason !== "in_progress";
  const secondsRemaining = submitted
    ? 0
    : computeExamSecondsRemaining(attempt.started_at, Date.now(), durationSeconds);

  const answers = await loadAttemptAnswers(admin, attempt.id);

  return {
    attempt_id: attempt.id,
    quiz_id: quizId,
    title,
    status: submitted ? "submitted" : "in_progress",
    submit_reason: submitted ? attempt.submit_reason : null,
    started_at: attempt.started_at,
    submitted_at: attempt.submitted_at,
    seconds_remaining: secondsRemaining,
    duration_seconds: durationSeconds,
    current_index: 0,
    question_count: questions.length,
    questions: stripCorrectFlag(questions),
    answers,
  };
}

export async function startExamAttempt(
  admin: SupabaseClient,
  quizId: string,
  userId: string,
  email: string,
  title: string,
): Promise<{ ok: true; state: ExamAttemptState } | { ok: false; message: string }> {
  const existing = await loadExamAttempt(admin, quizId, userId);
  if (existing) {
    if (existing.submit_reason !== "in_progress") {
      return { ok: false, message: "Du hast diese Klausur bereits abgeschickt." };
    }
    const state = await buildExamAttemptState(admin, quizId, existing, title);
    if (!state) return { ok: false, message: "Klausur konnte nicht geladen werden." };
    return { ok: true, state };
  }

  const detail = await loadQuizDetail(admin, quizId);
  if (!detail) {
    return { ok: false, message: "Klausur konnte nicht geladen werden." };
  }

  const poolCounts = countQuestionsInPool(detail.questions);
  const examConfig = detail.exam_config_json ?? parseExamConfig(detail.exam_config_json);
  const drawCounts = resolveEffectiveDrawCounts(
    examConfig,
    poolCounts,
    detail.questions.length,
  );

  const instance = buildStudentExamInstance(detail.questions, drawCounts);
  if (!instance.ok) {
    return { ok: false, message: instance.message };
  }

  const { data, error } = await admin
    .from("quiz_exam_attempts")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      display_email: email,
    })
    .select(
      "id, quiz_id, user_id, display_email, started_at, submitted_at, submit_reason, correct_count, total_count, percent_correct",
    )
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Klausur konnte nicht gestartet werden." };
  }

  const attempt = data as AttemptRow;
  const persisted = await persistAttemptQuestionSnapshot(admin, attempt.id, instance.snapshot);
  if (!persisted.ok) {
    await deleteExamAttempt(admin, attempt.id);
    return { ok: false, message: persisted.message };
  }

  const state = await buildExamAttemptState(admin, quizId, attempt, title);
  if (!state) {
    await deleteExamAttempt(admin, attempt.id);
    return { ok: false, message: "Klausur konnte nicht geladen werden." };
  }
  return { ok: true, state };
}

export async function saveExamAnswer(
  admin: SupabaseClient,
  attempt: AttemptRow,
  questionId: string,
  choiceId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (attempt.submit_reason !== "in_progress") {
    return { ok: false, message: "Klausur ist bereits abgeschickt." };
  }

  const durationSeconds = await resolveExamDurationForQuiz(admin, attempt.quiz_id);
  if (isExamTimedOut(attempt.started_at, Date.now(), durationSeconds)) {
    return { ok: false, message: "Die Zeit ist abgelaufen." };
  }

  const snapshot = await loadAttemptQuestionSnapshot(admin, attempt.id);
  if (snapshot.length > 0) {
    const allowed = snapshotQuestionIds(snapshot);
    if (!allowed.has(questionId)) {
      return { ok: false, message: "Diese Frage gehört nicht zu deiner Klausur." };
    }
  }

  const { data: existing } = await admin
    .from("quiz_exam_answers")
    .select("id")
    .eq("attempt_id", attempt.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("quiz_exam_answers")
      .update({ choice_id: choiceId })
      .eq("id", (existing as { id: string }).id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await admin.from("quiz_exam_answers").insert({
      attempt_id: attempt.id,
      question_id: questionId,
      choice_id: choiceId,
    });
    if (error) return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function finalizeExamAttempt(
  admin: SupabaseClient,
  attempt: AttemptRow,
  reason: "manual" | "timeout",
): Promise<{ ok: true; state: ExamAttemptState } | { ok: false; message: string }> {
  if (attempt.submit_reason !== "in_progress") {
    const detail = await loadQuizDetail(admin, attempt.quiz_id);
    const state = await buildExamAttemptState(
      admin,
      attempt.quiz_id,
      attempt,
      detail?.title ?? "Klausur",
    );
    if (!state) return { ok: false, message: "Klausur nicht gefunden." };
    return { ok: true, state };
  }

  const detail = await loadQuizDetail(admin, attempt.quiz_id);
  if (!detail) return { ok: false, message: "Klausur nicht gefunden." };

  const attemptQuestions = await resolveAttemptQuestions(admin, attempt.quiz_id, attempt.id);
  if (!attemptQuestions) return { ok: false, message: "Klausur nicht gefunden." };

  const { data: answerRows } = await admin
    .from("quiz_exam_answers")
    .select("question_id, choice_id")
    .eq("attempt_id", attempt.id);

  const answers = (answerRows ?? []) as { question_id: string; choice_id: string | null }[];
  const scored = scoreExamAnswers(attemptQuestions, answers);

  for (const q of attemptQuestions) {
    const answer = answers.find((a) => a.question_id === q.id);
    const correctChoice = q.choices.find((c) => c.is_correct);
    const isCorrect = Boolean(
      answer?.choice_id && correctChoice && answer.choice_id === correctChoice.id,
    );

    const { data: existing } = await admin
      .from("quiz_exam_answers")
      .select("id")
      .eq("attempt_id", attempt.id)
      .eq("question_id", q.id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("quiz_exam_answers")
        .update({ is_correct: isCorrect, choice_id: answer?.choice_id ?? null })
        .eq("id", (existing as { id: string }).id);
    } else {
      await admin.from("quiz_exam_answers").insert({
        attempt_id: attempt.id,
        question_id: q.id,
        choice_id: answer?.choice_id ?? null,
        is_correct: isCorrect,
      });
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("quiz_exam_attempts")
    .update({
      submitted_at: now,
      submit_reason: reason,
      correct_count: scored.correct_count,
      total_count: scored.total_count,
      percent_correct: scored.percent_correct,
    })
    .eq("id", attempt.id)
    .select(
      "id, quiz_id, user_id, display_email, started_at, submitted_at, submit_reason, correct_count, total_count, percent_correct",
    )
    .single();

  if (error || !updated) {
    return { ok: false, message: error?.message ?? "Abgabe fehlgeschlagen." };
  }

  const state = await buildExamAttemptState(
    admin,
    attempt.quiz_id,
    updated as AttemptRow,
    detail.title,
  );
  if (!state) return { ok: false, message: "Klausur nicht gefunden." };
  return { ok: true, state };
}

export async function maybeAutoSubmitExam(
  admin: SupabaseClient,
  attempt: AttemptRow,
): Promise<AttemptRow> {
  if (attempt.submit_reason !== "in_progress") return attempt;

  const durationSeconds = await resolveExamDurationForQuiz(admin, attempt.quiz_id);
  if (!isExamTimedOut(attempt.started_at, Date.now(), durationSeconds)) return attempt;

  const result = await finalizeExamAttempt(admin, attempt, "timeout");
  if (!result.ok) return attempt;

  const reloaded = await loadExamAttempt(admin, attempt.quiz_id, attempt.user_id);
  return reloaded ?? attempt;
}

export async function loadExamResults(
  admin: SupabaseClient,
  quizId: string,
): Promise<ExamResultSummary[]> {
  const { data } = await admin
    .from("quiz_exam_attempts")
    .select(
      "id, user_id, display_email, started_at, submitted_at, submit_reason, correct_count, total_count, percent_correct",
    )
    .eq("quiz_id", quizId)
    .order("submitted_at", { ascending: false, nullsFirst: false });

  return (data ?? []).map((row) => {
    const r = row as AttemptRow;
    return {
      attempt_id: r.id,
      user_id: r.user_id,
      display_email: r.display_email,
      started_at: r.started_at,
      submitted_at: r.submitted_at,
      submit_reason: r.submit_reason === "in_progress" ? null : r.submit_reason,
      correct_count: r.correct_count,
      total_count: r.total_count,
      percent_correct: r.percent_correct !== null ? Number(r.percent_correct) : null,
      in_progress: r.submit_reason === "in_progress",
    };
  });
}

export async function loadExamResultDetail(
  admin: SupabaseClient,
  quizId: string,
  userId: string,
): Promise<ExamResultDetail | null> {
  const attempt = await loadExamAttempt(admin, quizId, userId);
  if (!attempt) return null;

  const attemptQuestions = await resolveAttemptQuestions(admin, quizId, attempt.id);
  if (!attemptQuestions) return null;

  const { data: answerRows } = await admin
    .from("quiz_exam_answers")
    .select("question_id, choice_id, is_correct")
    .eq("attempt_id", attempt.id);

  const answerMap = new Map(
    (answerRows ?? []).map((r) => {
      const row = r as { question_id: string; choice_id: string | null; is_correct: boolean | null };
      return [row.question_id, row] as const;
    }),
  );

  const questions = attemptQuestions.map((q, index) => {
    const answer = answerMap.get(q.id);
    const correct = q.choices.find((c) => c.is_correct);
    const selected = answer?.choice_id
      ? q.choices.find((c) => c.id === answer.choice_id)
      : null;
    return {
      question_id: q.id,
      prompt: q.prompt,
      sort_order: index,
      choice_id: answer?.choice_id ?? null,
      choice_text: selected?.text ?? null,
      is_correct: answer?.is_correct ?? null,
      correct_choice_id: correct?.id ?? "",
      correct_choice_text: correct?.text ?? "",
    };
  });

  return {
    attempt_id: attempt.id,
    user_id: attempt.user_id,
    display_email: attempt.display_email,
    started_at: attempt.started_at,
    submitted_at: attempt.submitted_at,
    submit_reason: attempt.submit_reason === "in_progress" ? null : attempt.submit_reason,
    correct_count: attempt.correct_count,
    total_count: attempt.total_count,
    percent_correct:
      attempt.percent_correct !== null ? Number(attempt.percent_correct) : null,
    in_progress: attempt.submit_reason === "in_progress",
    questions,
  };
}

export { countQuestionsByDifficulty };
