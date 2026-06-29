import type { DifficultyCounts, ExamConfig, QuizSettings } from "@/lib/server/quiz-types";
import { totalDifficultyCounts } from "@/lib/server/quiz-types";
import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";

function parseDifficultyCounts(raw: unknown): DifficultyCounts | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const easy = Number(o.easy);
  const medium = Number(o.medium);
  const hard = Number(o.hard);
  if (
    !Number.isInteger(easy) ||
    !Number.isInteger(medium) ||
    !Number.isInteger(hard) ||
    easy < 0 ||
    medium < 0 ||
    hard < 0
  ) {
    return null;
  }
  return { easy, medium, hard };
}

export function parseQuizSettings(raw: unknown): QuizSettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const choice_count = Number(o.choice_count);
  if (!Number.isInteger(choice_count)) return null;

  const poolRaw = o.pool_counts;
  if (poolRaw !== undefined && poolRaw !== null) {
    const pool_counts = parseDifficultyCounts(poolRaw);
    if (!pool_counts) return null;
    const question_count = totalDifficultyCounts(pool_counts);
    return { choice_count, pool_counts, question_count };
  }

  const question_count = Number(o.question_count);
  const difficulty = o.difficulty;
  if (
    !Number.isInteger(question_count) ||
    (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard")
  ) {
    return null;
  }
  return { question_count, choice_count, difficulty };
}

export function parseExamConfig(raw: unknown): ExamConfig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const duration_seconds = Number(o.duration_seconds);
  const draw_counts = parseDifficultyCounts(o.draw_counts);
  if (!Number.isInteger(duration_seconds) || !draw_counts) return null;
  return { duration_seconds, draw_counts };
}

export function resolveExamDuration(config: ExamConfig | null | undefined): number {
  if (config?.duration_seconds != null) return config.duration_seconds;
  return EXAM_DURATION_SECONDS;
}
