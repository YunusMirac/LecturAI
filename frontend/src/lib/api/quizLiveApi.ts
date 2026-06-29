import { apiFetch, type ApiFail } from "@/lib/api/fetch-auth";
import type { LiveHostState, LivePlayState } from "@/lib/server/quiz-live-types";

type ApiFailResult = ApiFail;

export type QuizJoinPreview = {
  quiz_id: string;
  course_id: string;
  title: string;
  quiz_type: "live" | "exam";
  live_open?: boolean;
  live_status?: string;
  already_joined?: boolean;
  exam_open?: boolean;
  has_attempt?: boolean;
  in_progress?: boolean;
  already_submitted?: boolean;
};

function fail(result: ApiFail): ApiFailResult {
  return result;
}

export async function joinQuizByCode(quizId: string, accessCode: string) {
  const result = await apiFetch<{
    quiz_id?: string;
    title?: string;
    detail?: string;
    quiz_type?: string;
  }>(`/api/quizzes/${encodeURIComponent(quizId)}/join`, {
    method: "POST",
    body: JSON.stringify({ access_code: accessCode }),
    fallback: "Beitritt fehlgeschlagen.",
  });
  if (!result.ok) return fail(result);
  if (!result.data.quiz_id) return { ok: false as const, message: "Unerwartete Antwort vom Server." };
  return {
    ok: true as const,
    quizId: result.data.quiz_id,
    title: result.data.title ?? "Quiz",
    detail: result.data.detail ?? "Beigetreten.",
    quizType: result.data.quiz_type === "exam" ? ("exam" as const) : ("live" as const),
  };
}

export async function fetchQuizJoinPreview(quizId: string) {
  const result = await apiFetch<QuizJoinPreview>(
    `/api/quizzes/${encodeURIComponent(quizId)}/join`,
    { fallback: "Quiz konnte nicht geladen werden." },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, preview: result.data };
}

export async function fetchLiveHostState(quizId: string) {
  const result = await apiFetch<LiveHostState>(
    `/api/quizzes/${encodeURIComponent(quizId)}/live`,
    { fallback: "Live-Status konnte nicht geladen werden." },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, state: result.data };
}

export async function liveHostAction(
  quizId: string,
  action: "open" | "close" | "start" | "reset",
) {
  const result = await apiFetch<{ detail?: string; access_code?: string }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/live`,
    { method: "POST", body: JSON.stringify({ action }), fallback: "Aktion fehlgeschlagen." },
  );
  if (!result.ok) return fail(result);
  return {
    ok: true as const,
    detail: result.data.detail ?? "OK",
    access_code: result.data.access_code,
  };
}

export async function fetchLivePlayState(quizId: string) {
  const result = await apiFetch<LivePlayState>(
    `/api/quizzes/${encodeURIComponent(quizId)}/live/play`,
    { fallback: "Spielstatus konnte nicht geladen werden." },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, state: result.data };
}

export async function submitLiveAnswer(quizId: string, choiceId: string) {
  const result = await apiFetch<{ detail?: string; points?: number }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/live/play`,
    {
      method: "POST",
      body: JSON.stringify({ choice_id: choiceId }),
      fallback: "Antwort konnte nicht gesendet werden.",
    },
  );
  if (!result.ok) return fail(result);
  return { ok: true as const, points: result.data.points ?? 0 };
}

export type { LiveHostState, LivePlayState };
