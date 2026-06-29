import { apiFetch, type ApiFail } from "@/lib/api/fetch-auth";
import type {
  ExamAttemptState,
  ExamResultDetail,
  ExamResultSummary,
} from "@/lib/server/quiz-exam-types";
import type { DifficultyCounts, ExamConfig } from "@/lib/server/quiz-types";

type ApiFailResult = ApiFail;

export type ExamMeta = {
  quiz_id: string;
  title: string;
  status: string;
  exam_open: boolean;
  access_code?: string | null;
  can_manage: boolean;
  exam_config: ExamConfig | null;
  pool_counts: DifficultyCounts | null;
  duration_seconds: number;
  results: ExamResultSummary[];
};

export type ExamPreview = {
  quiz_id: string;
  title: string;
  has_attempt: boolean;
  exam_open?: boolean;
  state?: ExamAttemptState;
};

function fail(result: ApiFail): ApiFailResult {
  return result;
}

export async function fetchExamMeta(quizId: string) {
  const result = await apiFetch<ExamMeta>(`/api/quizzes/${encodeURIComponent(quizId)}/exam`, {
    fallback: "Klausur konnte nicht geladen werden.",
  });
  if (!result.ok) return fail(result);
  return { ok: true as const, meta: result.data };
}

export async function examTeacherAction(quizId: string, action: "open" | "close") {
  const result = await apiFetch<{
    detail?: string;
    exam_open?: boolean;
    access_code?: string;
  }>(`/api/quizzes/${encodeURIComponent(quizId)}/exam`, {
    method: "POST",
    body: JSON.stringify({ action }),
    fallback: "Aktion fehlgeschlagen.",
  });
  if (!result.ok) return fail(result);
  return {
    ok: true as const,
    detail: result.data.detail ?? "OK",
    exam_open: Boolean(result.data.exam_open),
    access_code: result.data.access_code,
  };
}

export async function saveExamConfig(
  quizId: string,
  payload: {
    duration_minutes: number;
    draw_easy: number;
    draw_medium: number;
    draw_hard: number;
  },
) {
  const result = await apiFetch<{ detail?: string }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/exam`,
    { method: "PATCH", body: JSON.stringify(payload), fallback: "Speichern fehlgeschlagen." },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, detail: result.data.detail ?? "Gespeichert." };
}

export async function fetchExamPreview(quizId: string) {
  const result = await apiFetch<ExamPreview>(
    `/api/quizzes/${encodeURIComponent(quizId)}/exam/attempt`,
    { fallback: "Klausur konnte nicht geladen werden." },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, preview: result.data };
}

export async function saveExamAnswer(
  quizId: string,
  questionId: string,
  choiceId: string | null,
) {
  const result = await apiFetch<{ state?: ExamAttemptState; detail?: string }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/exam/attempt`,
    {
      method: "PATCH",
      body: JSON.stringify({ question_id: questionId, choice_id: choiceId }),
      fallback: "Speichern fehlgeschlagen.",
    },
  );
  if (!result.ok) return fail(result);
  if (!result.data.state) return { ok: false as const, message: "Unerwartete Antwort." };
  return { ok: true as const, state: result.data.state };
}

export async function submitExam(quizId: string) {
  const result = await apiFetch<{ detail?: string; state?: ExamAttemptState }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/exam/submit`,
    { method: "POST", fallback: "Abgabe fehlgeschlagen." },
  );
  if (!result.ok) return fail(result);
  if (!result.data.state) return { ok: false as const, message: "Unerwartete Antwort." };
  return {
    ok: true as const,
    detail: result.data.detail ?? "Abgeschickt.",
    state: result.data.state,
  };
}

export async function fetchExamResults(quizId: string) {
  const result = await apiFetch<{ title?: string; results?: ExamResultSummary[] }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/exam/results`,
    { fallback: "Ergebnisse konnten nicht geladen werden." },
  );
  if (!result.ok) return fail(result);
  return {
    ok: true as const,
    title: result.data.title ?? "Klausur",
    results: Array.isArray(result.data.results) ? result.data.results : [],
  };
}

export async function fetchExamResultDetail(quizId: string, userId: string) {
  const result = await apiFetch<ExamResultDetail>(
    `/api/quizzes/${encodeURIComponent(quizId)}/exam/results/${encodeURIComponent(userId)}`,
    { fallback: "Details konnten nicht geladen werden." },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, detail: result.data };
}

export type { ExamAttemptState, ExamResultDetail, ExamResultSummary };
