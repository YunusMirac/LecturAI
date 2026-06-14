import { createAdminClient } from "@/lib/server/api-helpers";
import { loadExamResults } from "@/lib/server/quiz-exam";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  if (!access.canManage) {
    return NextResponse.json({ detail: "Keine Berechtigung." }, { status: 403 });
  }

  const quiz = access.quiz as { quiz_type?: string; title: string };
  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }

  const admin = createAdminClient();
  const results = await loadExamResults(admin, quizId);

  return NextResponse.json({
    quiz_id: quizId,
    title: quiz.title,
    results,
  });
}
