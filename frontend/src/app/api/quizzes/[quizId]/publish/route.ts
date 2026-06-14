import { createAdminClient } from "@/lib/server/api-helpers";
import { loadQuizDetail } from "@/lib/server/quiz-db";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { validateQuizForPublish } from "@/lib/server/quiz-validation";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "generating") {
    return NextResponse.json(
      { detail: "Quiz wird noch erstellt. Bitte warten." },
      { status: 409 },
    );
  }
  if (managed.quiz.status === "failed") {
    return NextResponse.json(
      { detail: "Quiz-Generierung fehlgeschlagen. Bitte neu erstellen." },
      { status: 409 },
    );
  }
  if (managed.quiz.status === "published") {
    return NextResponse.json({ detail: "Quiz ist bereits veröffentlicht." }, { status: 409 });
  }

  const admin = createAdminClient();
  const detail = await loadQuizDetail(admin, quizId);
  if (!detail) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  const publishCheck = validateQuizForPublish(detail.questions);
  if (!publishCheck.ok) {
    return NextResponse.json({ detail: publishCheck.message }, { status: 400 });
  }

  const { error } = await admin
    .from("quizzes")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", quizId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    detail: "Quiz veröffentlicht. Schüler:innen können es in Phase 3 bearbeiten.",
    status: "published",
  });
}
