import { createAdminClient } from "@/lib/server/api-helpers";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";

type RouteContext = {
  params: Promise<{ quizId: string; questionId: string; choiceId: string }>;
};

async function getChoiceQuestionId(
  admin: ReturnType<typeof createAdminClient>,
  choiceId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("quiz_choices")
    .select("question_id")
    .eq("id", choiceId)
    .maybeSingle();
  return data ? String((data as { question_id: string }).question_id) : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { quizId, questionId, choiceId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "published") {
    return NextResponse.json({ detail: "Veröffentlichte Quizze sind gesperrt." }, { status: 409 });
  }

  let body: { text?: string; is_correct?: boolean };
  try {
    body = (await request.json()) as { text?: string; is_correct?: boolean };
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const choiceQuestionId = await getChoiceQuestionId(admin, choiceId);
  if (choiceQuestionId !== questionId) {
    return NextResponse.json({ detail: "Antwort nicht gefunden." }, { status: 404 });
  }

  const { data: question } = await admin
    .from("quiz_questions")
    .select("id")
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ detail: "Frage nicht gefunden." }, { status: 404 });
  }

  const updates: { text?: string; is_correct?: boolean } = {};
  if (typeof body.text === "string") {
    const text = body.text.trim();
    if (!text) {
      return NextResponse.json({ text: ["Antworttext ist erforderlich."] }, { status: 400 });
    }
    updates.text = text;
  }
  if (typeof body.is_correct === "boolean") {
    updates.is_correct = body.is_correct;
    if (body.is_correct) {
      await admin
        .from("quiz_choices")
        .update({ is_correct: false })
        .eq("question_id", questionId)
        .neq("id", choiceId);
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ detail: "Keine Änderungen." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("quiz_choices")
    .update(updates)
    .eq("id", choiceId)
    .select("id, question_id, text, is_correct, sort_order")
    .maybeSingle();

  if (error) {
    return internalErrorResponse("[choiceId]", error);
  }
  if (!data) {
    return NextResponse.json({ detail: "Antwort nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { quizId, questionId, choiceId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "published") {
    return NextResponse.json({ detail: "Veröffentlichte Quizze sind gesperrt." }, { status: 409 });
  }

  const admin = createAdminClient();
  const choiceQuestionId = await getChoiceQuestionId(admin, choiceId);
  if (choiceQuestionId !== questionId) {
    return NextResponse.json({ detail: "Antwort nicht gefunden." }, { status: 404 });
  }

  const { count } = await admin
    .from("quiz_choices")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);

  if ((count ?? 0) <= 2) {
    return NextResponse.json(
      { detail: "Mindestens zwei Antworten pro Frage erforderlich." },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("quiz_choices")
    .delete()
    .eq("id", choiceId)
    .select("id");

  if (error) {
    return internalErrorResponse("[choiceId]", error);
  }
  if (!data?.length) {
    return NextResponse.json({ detail: "Antwort nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ detail: "Antwort gelöscht." });
}
