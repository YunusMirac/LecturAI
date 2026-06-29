import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AttemptQuestionSnapshot,
  GeneratedQuizPayload,
  QuizChoiceRow,
  QuizDetail,
  QuizDifficulty,
  QuizQuestionWithChoices,
  QuizRow,
  QuizSettings,
} from "@/lib/server/quiz-types";
import { emptyDifficultyCounts } from "@/lib/server/quiz-types";
import { parseExamConfig, parseQuizSettings } from "@/lib/server/quiz-validation";
import { generateAccessCode } from "@/lib/server/quiz-access-code";

export async function loadQuizDetail(
  admin: SupabaseClient,
  quizId: string,
): Promise<QuizDetail | null> {
  const { data: quiz, error } = await admin
    .from("quizzes")
    .select(
      "id, course_id, title, status, settings_json, exam_config_json, source_pdf_path, generation_error, created_by, published_at, created_at, updated_at, quiz_type, exam_open, live_open",
    )
    .eq("id", quizId)
    .maybeSingle();

  if (error || !quiz) return null;

  const row = quiz as QuizRow;
  const settings = parseQuizSettings(row.settings_json) ?? {
    question_count: 5,
    choice_count: 4,
    difficulty: "medium" as const,
  };

  const { data: questionRows } = await admin
    .from("quiz_questions")
    .select("id, quiz_id, prompt, sort_order, difficulty, created_at")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });

  const questions: QuizQuestionWithChoices[] = [];
  for (const q of questionRows ?? []) {
    const { data: choiceRows } = await admin
      .from("quiz_choices")
      .select("id, question_id, text, is_correct, sort_order")
      .eq("question_id", (q as { id: string }).id)
      .order("sort_order", { ascending: true });

    const qr = q as QuizQuestionWithChoices;
    questions.push({
      ...qr,
      difficulty: (qr.difficulty ?? "medium") as QuizDifficulty,
      choices: (choiceRows ?? []) as QuizChoiceRow[],
    });
  }

  return {
    ...row,
    exam_config_json: parseExamConfig(row.exam_config_json) ?? null,
    settings_json: settings,
    questions,
  };
}

export async function insertGeneratedQuestions(
  admin: SupabaseClient,
  quizId: string,
  payload: GeneratedQuizPayload,
): Promise<void> {
  for (let qi = 0; qi < payload.questions.length; qi++) {
    const q = payload.questions[qi]!;
    const difficulty = q.difficulty ?? "medium";
    const { data: inserted, error: qError } = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: quizId,
        prompt: q.prompt.trim(),
        sort_order: qi,
        difficulty,
      })
      .select("id")
      .single();

    if (qError || !inserted) {
      throw new Error(qError?.message ?? "Frage konnte nicht gespeichert werden.");
    }

    const questionId = (inserted as { id: string }).id;
    const choiceRows = q.choices.map((c, ci) => ({
      question_id: questionId,
      text: c.text.trim(),
      is_correct: c.is_correct,
      sort_order: ci,
    }));

    const { error: cError } = await admin.from("quiz_choices").insert(choiceRows);
    if (cError) {
      throw new Error(cError.message);
    }
  }
}

export function countQuestionsByDifficulty(questions: QuizQuestionWithChoices[]) {
  const counts = emptyDifficultyCounts();
  for (const q of questions) {
    const d = q.difficulty ?? "medium";
    if (d === "easy" || d === "medium" || d === "hard") {
      counts[d] += 1;
    }
  }
  return counts;
}

export async function loadAttemptQuestionSnapshot(
  admin: SupabaseClient,
  attemptId: string,
): Promise<AttemptQuestionSnapshot[]> {
  const { data } = await admin
    .from("quiz_exam_attempt_questions")
    .select("question_id, sort_order")
    .eq("attempt_id", attemptId)
    .order("sort_order", { ascending: true });

  return (data ?? []) as AttemptQuestionSnapshot[];
}

export async function persistAttemptQuestionSnapshot(
  admin: SupabaseClient,
  attemptId: string,
  snapshot: AttemptQuestionSnapshot[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (snapshot.length === 0) return { ok: true };

  const rows = snapshot.map((row) => ({
    attempt_id: attemptId,
    question_id: row.question_id,
    sort_order: row.sort_order,
  }));

  const { error } = await admin.from("quiz_exam_attempt_questions").insert(rows);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteExamAttempt(admin: SupabaseClient, attemptId: string): Promise<void> {
  await admin.from("quiz_exam_attempts").delete().eq("id", attemptId);
}

export async function countExamAttempts(admin: SupabaseClient, quizId: string): Promise<number> {
  const { count } = await admin
    .from("quiz_exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  return count ?? 0;
}

export async function allocateFreshAccessCode(
  admin: SupabaseClient,
  quizId: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateAccessCode();
    const { data: clash } = await admin
      .from("quizzes")
      .select("id")
      .eq("access_code", candidate)
      .neq("id", quizId)
      .maybeSingle();
    if (!clash) return candidate;
  }
  return null;
}

export function defaultQuizTitle(courseName: string): string {
  const date = new Date().toLocaleDateString("de-DE");
  return `Quiz — ${courseName} — ${date}`;
}

export function buildPdfStoragePath(courseId: string, quizId: string): string {
  return `${courseId}/${quizId}/source.pdf`;
}

export function parseSettingsFromRow(row: QuizRow): QuizSettings {
  return (
    parseQuizSettings(row.settings_json) ?? {
      question_count: 5,
      choice_count: 4,
      difficulty: "medium",
    }
  );
}
