import { createAdminClient } from "@/lib/server/api-helpers";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { MAX_CHOICES, MIN_CHOICES } from "@/lib/server/quiz-validation";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "generating") {
    return NextResponse.json({ detail: "Quiz wird noch erstellt." }, { status: 409 });
  }

  let body: { prompt?: string; choices?: { text: string; is_correct: boolean }[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ prompt: ["Fragetext ist erforderlich."] }, { status: 400 });
  }

  const choices = body.choices ?? [];
  if (choices.length < MIN_CHOICES || choices.length > MAX_CHOICES) {
    return NextResponse.json(
      {
        choices: [`Zwischen ${MIN_CHOICES} und ${MAX_CHOICES} Antworten erforderlich.`],
      },
      { status: 400 },
    );
  }

  const correctCount = choices.filter((c) => c.is_correct).length;
  if (correctCount !== 1) {
    return NextResponse.json(
      { choices: ["Genau eine Antwort muss als richtig markiert sein."] },
      { status: 400 },
    );
  }

  for (const c of choices) {
    if (!c.text?.trim()) {
      return NextResponse.json({ choices: ["Antworttexte dürfen nicht leer sein."] }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { data: maxOrder } = await admin
    .from("quiz_questions")
    .select("sort_order")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = maxOrder ? Number((maxOrder as { sort_order: number }).sort_order) + 1 : 0;

  const { data: question, error: qError } = await admin
    .from("quiz_questions")
    .insert({ quiz_id: quizId, prompt, sort_order: sortOrder })
    .select("id, quiz_id, prompt, sort_order, created_at")
    .single();

  if (qError || !question) {
    return NextResponse.json({ detail: qError?.message ?? "Frage konnte nicht angelegt werden." }, { status: 500 });
  }

  const questionId = (question as { id: string }).id;
  const choiceRows = choices.map((c, i) => ({
    question_id: questionId,
    text: c.text.trim(),
    is_correct: c.is_correct,
    sort_order: i,
  }));

  const { data: insertedChoices, error: cError } = await admin
    .from("quiz_choices")
    .insert(choiceRows)
    .select("id, question_id, text, is_correct, sort_order");

  if (cError) {
    await admin.from("quiz_questions").delete().eq("id", questionId);
    return NextResponse.json({ detail: cError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ...(question as object),
      choices: insertedChoices ?? [],
    },
    { status: 201 },
  );
}
