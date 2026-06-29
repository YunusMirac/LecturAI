import { createAdminClient } from "@/lib/server/api-helpers";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";

type RouteContext = { params: Promise<{ quizId: string; questionId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { quizId, questionId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "published") {
    return NextResponse.json(
      { detail: "Veröffentlichte Quizze können nicht bearbeitet werden." },
      { status: 409 },
    );
  }

  let body: { prompt?: string };
  try {
    body = (await request.json()) as { prompt?: string };
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ prompt: ["Fragetext ist erforderlich."] }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quiz_questions")
    .update({ prompt })
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .select("id, quiz_id, prompt, sort_order, created_at")
    .maybeSingle();

  if (error) {
    return internalErrorResponse("[questionId]", error);
  }
  if (!data) {
    return NextResponse.json({ detail: "Frage nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { quizId, questionId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "published") {
    return NextResponse.json(
      { detail: "Veröffentlichte Quizze können nicht bearbeitet werden." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quiz_questions")
    .delete()
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .select("id");

  if (error) {
    return internalErrorResponse("[questionId]", error);
  }
  if (!data?.length) {
    return NextResponse.json({ detail: "Frage nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ detail: "Frage gelöscht." });
}
