import { createAdminClient } from "@/lib/server/api-helpers";
import { loadQuizDetail } from "@/lib/server/quiz-db";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  const admin = createAdminClient();
  const detail = await loadQuizDetail(admin, quizId);
  if (!detail) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  const admin = createAdminClient();
  const { error } = await admin.from("quizzes").delete().eq("id", quizId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ detail: "Quiz gelöscht." });
}
