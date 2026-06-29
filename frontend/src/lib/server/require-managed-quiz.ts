import {
  createAdminClient,
  getAuthenticatedProfile,
  type AuthProfile,
} from "@/lib/server/api-helpers";
import { canManageCourse, isValidCourseId } from "@/lib/server/course-access";
import { internalErrorResponse, missingServiceRoleResponse, notFoundResponse } from "@/lib/server/http-errors";
import type { QuizRow } from "@/lib/server/quiz-types";
import { NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidQuizId(quizId: string): boolean {
  return UUID_RE.test(quizId.trim());
}

type ManagedQuizResult =
  | { ok: true; quiz: QuizRow; courseTeacherId: string; profile: AuthProfile }
  | { error: NextResponse };

export async function requireManagedQuiz(
  request: Request,
  quizId: string,
): Promise<ManagedQuizResult> {
  if (!isValidQuizId(quizId)) {
    return {
      error: NextResponse.json({ detail: "Ungültige Quiz-ID." }, { status: 400 }),
    };
  }

  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) {
    return { error: auth.error };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: missingServiceRoleResponse("requireManagedQuiz"),
    };
  }

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select(
      "id, course_id, title, status, settings_json, source_pdf_path, generation_error, created_by, published_at, created_at, updated_at",
    )
    .eq("id", quizId)
    .maybeSingle();

  if (quizError) {
    return { error: internalErrorResponse("requireManagedQuiz", quizError) };
  }
  if (!quiz) {
    return { error: NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 }) };
  }

  const row = quiz as QuizRow;
  if (!isValidCourseId(row.course_id)) {
    return { error: internalErrorResponse("requireManagedQuiz:courseId") };
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("teacher_id")
    .eq("id", row.course_id)
    .maybeSingle();

  if (courseError || !course) {
    return { error: NextResponse.json({ detail: "Kurs nicht gefunden." }, { status: 404 }) };
  }

  const teacherId = String((course as { teacher_id: string }).teacher_id);
  if (!canManageCourse(auth.profile.role, auth.profile.id, teacherId)) {
    return { error: notFoundResponse() };
  }

  return { ok: true, quiz: row, courseTeacherId: teacherId, profile: auth.profile };
}

export { createAdminClient };
