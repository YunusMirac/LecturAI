import { authHeaders, parseApiDetail } from "@/lib/api/fetch-auth";
import type {
  LiveHostState,
  LivePlayState,
} from "@/lib/server/quiz-live-types";

type ApiFail = { ok: false; message: string };

export async function joinQuizByCode(
  quizId: string,
  accessCode: string,
): Promise<{ ok: true; quizId: string; title: string; detail: string; quizType: "live" | "exam" } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/join`, {
      method: "POST",
      headers,
      body: JSON.stringify({ access_code: accessCode }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      quiz_id?: string;
      title?: string;
      detail?: string;
      quiz_type?: string;
    };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Beitritt fehlgeschlagen.") };
    if (!data.quiz_id) return { ok: false, message: "Unerwartete Antwort vom Server." };
    return {
      ok: true,
      quizId: data.quiz_id,
      title: data.title ?? "Quiz",
      detail: data.detail ?? "Beigetreten.",
      quizType: data.quiz_type === "exam" ? "exam" : "live",
    };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

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

export async function fetchQuizJoinPreview(
  quizId: string,
): Promise<{ ok: true; preview: QuizJoinPreview } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/join`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Quiz konnte nicht geladen werden.") };
    return { ok: true, preview: data as QuizJoinPreview };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchLiveHostState(
  quizId: string,
): Promise<{ ok: true; state: LiveHostState } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/live`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Live-Status konnte nicht geladen werden.") };
    return { ok: true, state: data as LiveHostState };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function liveHostAction(
  quizId: string,
  action: "open" | "close" | "start" | "reset",
): Promise<{ ok: true; detail: string; access_code?: string } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/live`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      detail?: string;
      access_code?: string;
    };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Aktion fehlgeschlagen.") };
    return {
      ok: true,
      detail: data.detail ?? "OK",
      access_code: data.access_code,
    };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchLivePlayState(
  quizId: string,
): Promise<{ ok: true; state: LivePlayState } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/live/play`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Spielstatus konnte nicht geladen werden.") };
    return { ok: true, state: data as LivePlayState };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function submitLiveAnswer(
  quizId: string,
  choiceId: string,
): Promise<{ ok: true; points: number } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/live/play`, {
      method: "POST",
      headers,
      body: JSON.stringify({ choice_id: choiceId }),
    });
    const data = (await res.json().catch(() => ({}))) as { detail?: string; points?: number };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Antwort konnte nicht gesendet werden.") };
    return { ok: true, points: data.points ?? 0 };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export type { LiveHostState, LivePlayState };
