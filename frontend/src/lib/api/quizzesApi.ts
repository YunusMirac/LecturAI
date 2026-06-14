import { authHeaders, parseApiDetail } from "@/lib/api/fetch-auth";
import { getAccessToken } from "@/lib/api/authApi";

export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizType = "live" | "exam";

export type QuizStatus = "generating" | "draft" | "published" | "failed";

export type QuizSummary = {
  id: string;
  course_id: string;
  title: string;
  status: QuizStatus;
  quiz_type?: QuizType;
  settings_json: {
    question_count: number;
    choice_count: number;
    difficulty: QuizDifficulty;
  };
  generation_error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  live_open?: boolean;
  live_status?: string;
  exam_open?: boolean;
};

export type QuizChoice = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  prompt: string;
  sort_order: number;
  created_at: string;
  choices: QuizChoice[];
};

export type QuizDetail = QuizSummary & {
  source_pdf_path: string | null;
  created_by: string;
  questions: QuizQuestion[];
  quiz_type?: QuizType;
  exam_open?: boolean;
};

export type CourseDetail = {
  id: string;
  name: string;
  semester: string | null;
  teacher_id: string;
  created_at: string;
  can_manage: boolean;
};

type ApiFail = { ok: false; message: string };

export async function fetchCourseDetail(courseId: string):
  Promise<{ ok: true; course: CourseDetail } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Kurs konnte nicht geladen werden.") };
    return { ok: true, course: data as CourseDetail };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchCourseQuizzes(courseId: string):
  Promise<{ ok: true; quizzes: QuizSummary[] } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/quizzes`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Quizze konnten nicht geladen werden.") };
    return { ok: true, quizzes: Array.isArray(data) ? (data as QuizSummary[]) : [] };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function createQuizFromPdf(
  courseId: string,
  form: FormData,
): Promise<{ ok: true; quizId: string } | ApiFail> {
  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/quizzes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as { quiz_id?: string; detail?: string };
    if (!res.ok && res.status !== 202) {
      return { ok: false, message: parseApiDetail(data, "Quiz konnte nicht erstellt werden.") };
    }
    if (!data.quiz_id) return { ok: false, message: "Unerwartete Antwort vom Server." };
    return { ok: true, quizId: data.quiz_id };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function deleteQuiz(quizId: string): Promise<{ ok: true; detail: string } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`, {
      method: "DELETE",
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Löschen fehlgeschlagen.") };
    return { ok: true, detail: data.detail ?? "Gelöscht." };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function fetchQuizDetail(quizId: string):
  Promise<{ ok: true; quiz: QuizDetail } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`, {
      headers,
      cache: "no-store",
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Quiz konnte nicht geladen werden.") };
    return { ok: true, quiz: data as QuizDetail };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function publishQuiz(quizId: string): Promise<{ ok: true; detail: string } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/publish`, {
      method: "POST",
      headers,
    });
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Veröffentlichen fehlgeschlagen.") };
    return { ok: true, detail: data.detail ?? "Veröffentlicht." };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function updateQuestion(
  quizId: string,
  questionId: string,
  prompt: string,
): Promise<{ ok: true } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(
      `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
      { method: "PATCH", headers, body: JSON.stringify({ prompt }) },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Speichern fehlgeschlagen.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function deleteQuestion(
  quizId: string,
  questionId: string,
): Promise<{ ok: true } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(
      `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
      { method: "DELETE", headers },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Löschen fehlgeschlagen.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function updateChoice(
  quizId: string,
  questionId: string,
  choiceId: string,
  patch: { text?: string; is_correct?: boolean },
): Promise<{ ok: true } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(
      `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/choices/${encodeURIComponent(choiceId)}`,
      { method: "PATCH", headers, body: JSON.stringify(patch) },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Speichern fehlgeschlagen.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function addQuestion(
  quizId: string,
  payload: { prompt: string; choices: { text: string; is_correct: boolean }[] },
): Promise<{ ok: true } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}/questions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Frage konnte nicht angelegt werden.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function addChoice(
  quizId: string,
  questionId: string,
  payload: { text: string; is_correct?: boolean },
): Promise<{ ok: true } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(
      `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/choices`,
      { method: "POST", headers, body: JSON.stringify(payload) },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Antwort konnte nicht angelegt werden.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function deleteChoice(
  quizId: string,
  questionId: string,
  choiceId: string,
): Promise<{ ok: true } | ApiFail> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(
      `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/choices/${encodeURIComponent(choiceId)}`,
      { method: "DELETE", headers },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: parseApiDetail(data, "Löschen fehlgeschlagen.") };
    return { ok: true };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}
