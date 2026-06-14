import { createAdminClient } from "@/lib/server/api-helpers";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { MAX_CHOICES } from "@/lib/server/quiz-validation";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string; questionId: string }> };

async function assertQuestionInQuiz(admin: ReturnType<typeof createAdminClient>, quizId: string, questionId: string) {
  const { data } = await admin
    .from("quiz_questions")
    .select("id")
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request, context: RouteContext) {
  const { quizId, questionId } = await context.params;
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

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ text: ["Antworttext ist erforderlich."] }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await assertQuestionInQuiz(admin, quizId, questionId))) {
    return NextResponse.json({ detail: "Frage nicht gefunden." }, { status: 404 });
  }

  const { count } = await admin
    .from("quiz_choices")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);

  if ((count ?? 0) >= MAX_CHOICES) {
    return NextResponse.json({ text: [`Maximal ${MAX_CHOICES} Antworten pro Frage.`] }, { status: 400 });
  }

  const { data: maxOrder } = await admin
    .from("quiz_choices")
    .select("sort_order")
    .eq("question_id", questionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = maxOrder ? Number((maxOrder as { sort_order: number }).sort_order) + 1 : 0;
  const isCorrect = body.is_correct === true;

  if (isCorrect) {
    await admin
      .from("quiz_choices")
      .update({ is_correct: false })
      .eq("question_id", questionId);
  }

  const { data, error } = await admin
    .from("quiz_choices")
    .insert({
      question_id: questionId,
      text,
      is_correct: isCorrect,
      sort_order: sortOrder,
    })
    .select("id, question_id, text, is_correct, sort_order")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
