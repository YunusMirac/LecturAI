import { apiFetch, apiFetchForm, type ApiFail } from "@/lib/api/fetch-auth";
import type { QuizDifficulty, QuizStatus, QuizType } from "@/lib/quiz/domain";

export type { QuizDifficulty, QuizStatus, QuizType } from "@/lib/quiz/domain";

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
  difficulty?: QuizDifficulty;
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

function mapFail(result: ApiFail): { ok: false; message: string; notFound?: boolean } {
  return result;
}

export async function fetchCourseDetail(courseId: string) {
  const result = await apiFetch<CourseDetail>(`/api/courses/${encodeURIComponent(courseId)}`, {
    fallback: "Kurs konnte nicht geladen werden.",
  });
  if (!result.ok) return mapFail(result);
  return { ok: true as const, course: result.data };
}

export async function fetchCourseQuizzes(courseId: string) {
  const result = await apiFetch<QuizSummary[]>(
    `/api/courses/${encodeURIComponent(courseId)}/quizzes`,
    { fallback: "Quizze konnten nicht geladen werden." },
  );
  if (!result.ok) return mapFail(result);
  return { ok: true as const, quizzes: Array.isArray(result.data) ? result.data : [] };
}

export async function createQuizFromPdf(courseId: string, form: FormData) {
  const result = await apiFetchForm<{ quiz_id?: string }>(
    `/api/courses/${encodeURIComponent(courseId)}/quizzes`,
    form,
    "Quiz konnte nicht erstellt werden.",
  );
  if (!result.ok) return mapFail(result);
  if (!result.data.quiz_id) return { ok: false as const, message: "Unerwartete Antwort vom Server." };
  return { ok: true as const, quizId: result.data.quiz_id };
}

export async function deleteQuiz(quizId: string) {
  const result = await apiFetch<{ detail?: string }>(`/api/quizzes/${encodeURIComponent(quizId)}`, {
    method: "DELETE",
    fallback: "Löschen fehlgeschlagen.",
  });
  if (!result.ok) return mapFail(result);
  return { ok: true as const, detail: result.data.detail ?? "Gelöscht." };
}

export async function fetchQuizDetail(quizId: string) {
  const result = await apiFetch<QuizDetail>(`/api/quizzes/${encodeURIComponent(quizId)}`, {
    fallback: "Quiz konnte nicht geladen werden.",
  });
  if (!result.ok) return mapFail(result);
  return { ok: true as const, quiz: result.data };
}

export async function publishQuiz(quizId: string) {
  const result = await apiFetch<{ detail?: string }>(
    `/api/quizzes/${encodeURIComponent(quizId)}/publish`,
    { method: "POST", fallback: "Veröffentlichen fehlgeschlagen." },
  );
  if (!result.ok) return mapFail(result);
  return { ok: true as const, detail: result.data.detail ?? "Veröffentlicht." };
}

async function quizMutation(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<{ ok: true } | ApiFail> {
  const result = await apiFetch<unknown>(path, { ...init, fallback });
  return result.ok ? { ok: true } : mapFail(result);
}

export async function updateQuestion(quizId: string, questionId: string, prompt: string) {
  return quizMutation(
    `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
    { method: "PATCH", body: JSON.stringify({ prompt }) },
    "Speichern fehlgeschlagen.",
  );
}

export async function deleteQuestion(quizId: string, questionId: string) {
  return quizMutation(
    `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
    { method: "DELETE" },
    "Löschen fehlgeschlagen.",
  );
}

export async function updateChoice(
  quizId: string,
  questionId: string,
  choiceId: string,
  patch: { text?: string; is_correct?: boolean },
) {
  return quizMutation(
    `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/choices/${encodeURIComponent(choiceId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
    "Speichern fehlgeschlagen.",
  );
}

export async function addQuestion(
  quizId: string,
  payload: {
    prompt: string;
    choices: { text: string; is_correct: boolean }[];
    difficulty?: QuizDifficulty;
  },
) {
  return quizMutation(
    `/api/quizzes/${encodeURIComponent(quizId)}/questions`,
    { method: "POST", body: JSON.stringify(payload) },
    "Frage konnte nicht angelegt werden.",
  );
}

export async function addChoice(
  quizId: string,
  questionId: string,
  payload: { text: string; is_correct?: boolean },
) {
  return quizMutation(
    `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/choices`,
    { method: "POST", body: JSON.stringify(payload) },
    "Antwort konnte nicht angelegt werden.",
  );
}

export async function deleteChoice(quizId: string, questionId: string, choiceId: string) {
  return quizMutation(
    `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}/choices/${encodeURIComponent(choiceId)}`,
    { method: "DELETE" },
    "Löschen fehlgeschlagen.",
  );
}
