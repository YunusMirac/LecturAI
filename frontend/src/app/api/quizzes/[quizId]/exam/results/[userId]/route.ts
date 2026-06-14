import { createAdminClient } from "@/lib/server/api-helpers";
import { loadExamResultDetail } from "@/lib/server/quiz-exam";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string; userId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { quizId, userId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  if (!access.canManage) {
    return NextResponse.json({ detail: "Keine Berechtigung." }, { status: 403 });
  }

  const quiz = access.quiz as { quiz_type?: string };
  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }

  const admin = createAdminClient();
  const detail = await loadExamResultDetail(admin, quizId, userId);

  if (!detail) {
    return NextResponse.json({ detail: "Keine Abgabe gefunden." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
