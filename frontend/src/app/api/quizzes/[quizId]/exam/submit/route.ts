import { createAdminClient } from "@/lib/server/api-helpers";
import {
  finalizeExamAttempt,
  loadExamAttempt,
  maybeAutoSubmitExam,
} from "@/lib/server/quiz-exam";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  const quiz = access.quiz as { quiz_type?: string; status: string };
  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }
  if (quiz.status !== "published") {
    return NextResponse.json({ detail: "Klausur ist nicht veröffentlicht." }, { status: 403 });
  }

  const admin = createAdminClient();
  let attempt = await loadExamAttempt(admin, quizId, access.profile.id);
  if (!attempt) {
    return NextResponse.json({ detail: "Klausur wurde noch nicht gestartet." }, { status: 404 });
  }

  attempt = await maybeAutoSubmitExam(admin, attempt);
  if (attempt.submit_reason !== "in_progress") {
    return NextResponse.json({
      detail: "Klausur wurde bereits abgeschickt.",
      already_submitted: true,
    });
  }

  const result = await finalizeExamAttempt(admin, attempt, "manual");
  if (!result.ok) {
    return internalErrorResponse("exam-submit", result.message);
  }

  return NextResponse.json({
    detail: "Klausur abgeschickt. Vielen Dank!",
    state: result.state,
  });
}
