import { createAdminClient, type AuthProfile } from "@/lib/server/api-helpers";
import { isValidCourseId } from "@/lib/server/course-access";
import { requireCourseAccess } from "@/lib/server/require-course-access";
import { isValidQuizId } from "@/lib/server/require-managed-quiz";
import type { QuizRow } from "@/lib/server/quiz-types";
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
      error: NextResponse.json(
        { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
        { status: 500 },
      ),
    };
  }

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select(
      "id, course_id, title, status, settings_json, source_pdf_path, generation_error, created_by, published_at, created_at, updated_at, access_code, live_open, live_status, quiz_type, exam_open",
    )
    .eq("id", quizId)
    .maybeSingle();

  if (quizError) {
    return { error: NextResponse.json({ detail: quizError.message }, { status: 500 }) };
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
    return { error: NextResponse.json({ detail: "Kurs des Quiz ungültig." }, { status: 500 }) };
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
