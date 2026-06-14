import { authHeaders, parseApiDetail } from "@/lib/api/fetch-auth";
import type {
  ExamAttemptState,
  ExamResultDetail,
  ExamResultSummary,
} from "@/lib/server/quiz-exam-types";

type ApiFail = { ok: false; message: string };

export type ExamMeta = {
  quiz_id: string;
  title: string;
  status: string;
  exam_open: boolean;
  access_code?: string | null;
  can_manage: boolean;
  results: ExamResultSummary[];
};

export type ExamPreview = {
  quiz_id: string;
  title: string;
  has_attempt: boolean;
  exam_open?: boolean;
  state?: ExamAttemptState;
};

export async function fetchExamMeta(
  quizId: string,
): Promise<{ ok: true; meta: ExamMeta } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/exam`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Klausur konnte nicht geladen werden.") };
    return { ok: true, meta: data as ExamMeta };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function examTeacherAction(
  quizId: string,
  action: "open" | "close",
): Promise<{ ok: true; detail: string; exam_open: boolean; access_code?: string } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/exam`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      detail?: string;
      exam_open?: boolean;
      access_code?: string;
    };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Aktion fehlgeschlagen.") };
    return {
      ok: true,
      detail: data.detail ?? "OK",
      exam_open: Boolean(data.exam_open),
      access_code: data.access_code,
    };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchExamPreview(
  quizId: string,
): Promise<{ ok: true; preview: ExamPreview } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/exam/attempt`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Klausur konnte nicht geladen werden.") };
    return { ok: true, preview: data as ExamPreview };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function saveExamAnswer(
  quizId: string,
  questionId: string,
  choiceId: string | null,
): Promise<{ ok: true; state: ExamAttemptState } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/exam/attempt`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ question_id: questionId, choice_id: choiceId }),
    });
    const data = (await res.json().catch(() => ({}))) as { state?: ExamAttemptState; detail?: string };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Speichern fehlgeschlagen.") };
    if (!data.state) return { ok: false, message: "Unerwartete Antwort." };
    return { ok: true, state: data.state };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function submitExam(
  quizId: string,
): Promise<{ ok: true; detail: string; state: ExamAttemptState } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/exam/submit`, {
      method: "POST",
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as {
      detail?: string;
      state?: ExamAttemptState;
    };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Abgabe fehlgeschlagen.") };
    if (!data.state) return { ok: false, message: "Unerwartete Antwort." };
    return {
      ok: true,
      detail: data.detail ?? "Abgeschickt.",
      state: data.state,
    };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchExamResults(
  quizId: string,
): Promise<{ ok: true; title: string; results: ExamResultSummary[] } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/exam/results`, {
      headers,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      title?: string;
      results?: ExamResultSummary[];
      detail?: string;
    };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Ergebnisse konnten nicht geladen werden.") };
    return {
      ok: true,
      title: data.title ?? "Klausur",
      results: Array.isArray(data.results) ? data.results : [],
    };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchExamResultDetail(
  quizId: string,
  userId: string,
): Promise<{ ok: true; detail: ExamResultDetail } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(
      `/api/quizzes/${encodeURIComponent(quizId)}/exam/results/${encodeURIComponent(userId)}`,
      { headers, cache: "no-store" },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Details konnten nicht geladen werden.") };
    return { ok: true, detail: data as ExamResultDetail };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export type { ExamAttemptState, ExamResultDetail, ExamResultSummary };
