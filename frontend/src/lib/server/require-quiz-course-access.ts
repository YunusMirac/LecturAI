import { createAdminClient, type AuthProfile } from "@/lib/server/api-helpers";
import { isValidCourseId } from "@/lib/server/course-access";
import { requireCourseAccess } from "@/lib/server/require-course-access";
import { isValidQuizId } from "@/lib/server/require-managed-quiz";
import type { QuizRow } from "@/lib/server/quiz-types";
import { internalErrorResponse, missingServiceRoleResponse } from "@/lib/server/http-errors";
import { NextResponse } from "next/server";

type QuizCourseAccessResult =
  | {
      ok: true;
      quiz: QuizRow & {
        access_code: string | null;
        live_open: boolean;
        live_status: string;
      };
      canManage: boolean;
      profile: AuthProfile;
    }
  | { error: NextResponse };

export async function requireQuizCourseAccess(
  request: Request,
  quizId: string,
): Promise<QuizCourseAccessResult> {
  if (!isValidQuizId(quizId)) {
    return {
      error: NextResponse.json({ detail: "Ungültige Quiz-ID." }, { status: 400 }),
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: missingServiceRoleResponse("requireQuizCourseAccess"),
    };
  }

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select(
      "id, course_id, title, status, settings_json, exam_config_json, source_pdf_path, generation_error, created_by, published_at, created_at, updated_at, access_code, live_open, live_status, quiz_type, exam_open",
    )
    .eq("id", quizId)
    .maybeSingle();

  if (quizError) {
    return { error: internalErrorResponse("requireQuizCourseAccess", quizError) };
  }
  if (!quiz) {
    return { error: NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 }) };
  }

  const row = quiz as QuizRow & {
    access_code: string | null;
    live_open: boolean;
    live_status: string;
    quiz_type: string;
    exam_open: boolean;
  };

  if (!isValidCourseId(row.course_id)) {
    return { error: internalErrorResponse("requireQuizCourseAccess:courseId") };
  }

  const access = await requireCourseAccess(request, row.course_id);
  if ("error" in access) {
    return { error: access.error };
  }

  return {
    ok: true,
    quiz: row,
    canManage: access.canManage,
    profile: access.profile,
  };
}
