import { createAdminClient } from "@/lib/server/api-helpers";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import type { QuizDifficulty } from "@/lib/server/quiz-types";
import { MAX_CHOICES, MIN_CHOICES } from "@/lib/server/quiz-validation";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";
import { EXAM_DIFFICULTY_ORDER } from "@/lib/quiz/domain";

type DifficultyResult = { difficulty: QuizDifficulty } | { error: NextResponse };

function resolveDifficulty(quizType: string | undefined, raw: unknown): DifficultyResult {
  if (quizType === "exam") {
    if (typeof raw !== "string" || !EXAM_DIFFICULTY_ORDER.includes(raw as QuizDifficulty)) {
      return {
        error: NextResponse.json(
          { difficulty: ["Schwierigkeit muss easy, medium oder hard sein."] },
          { status: 400 },
        ),
      };
    }
    return { difficulty: raw as QuizDifficulty };
  }
  return { difficulty: "medium" };
}

type RouteContext = { params: Promise<{ quizId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status === "generating") {
    return NextResponse.json({ detail: "Quiz wird noch erstellt." }, { status: 409 });
  }

  let body: {
    prompt?: string;
    choices?: { text: string; is_correct: boolean }[];
    difficulty?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const difficultyResult = resolveDifficulty(managed.quiz.quiz_type, body.difficulty);
  if ("error" in difficultyResult) return difficultyResult.error;
  const difficulty = difficultyResult.difficulty;

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
    .insert({ quiz_id: quizId, prompt, sort_order: sortOrder, difficulty })
    .select("id, quiz_id, prompt, sort_order, difficulty, created_at")
    .single();

  if (qError || !question) {
    return internalErrorResponse("questions:create", qError);
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
    return internalErrorResponse("questions", cError);
  }

  return NextResponse.json(
    {
      ...(question as object),
      choices: insertedChoices ?? [],
    },
    { status: 201 },
  );
}
