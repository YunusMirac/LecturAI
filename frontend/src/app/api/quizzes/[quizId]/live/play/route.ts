import { createAdminClient, getAuthenticatedProfile } from "@/lib/server/api-helpers";
import { buildLivePlayState, computePoints, fetchLiveQuizRow } from "@/lib/server/quiz-live";
import { loadQuizDetail } from "@/lib/server/quiz-db";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const quiz = await fetchLiveQuizRow(admin, quizId);
  if (!quiz || !quiz.live_open) {
    return NextResponse.json({ detail: "Quiz nicht aktiv." }, { status: 404 });
  }

  const { data: participant } = await admin
    .from("quiz_live_participants")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", auth.profile.id)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json(
      { detail: "Bitte zuerst mit dem Zugangscode beitreten." },
      { status: 403 },
    );
  }

  const state = await buildLivePlayState(admin, quiz, auth.profile.id);
  if (!state) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(state);
}

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  let body: { choice_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const choiceId = body.choice_id?.trim();
  if (!choiceId) {
    return NextResponse.json({ choice_id: ["Bitte eine Antwort wählen."] }, { status: 400 });
  }

  const admin = createAdminClient();
  const quiz = await fetchLiveQuizRow(admin, quizId);
  if (!quiz || quiz.live_status !== "question") {
    return NextResponse.json(
      { detail: "Gerade kann keine Antwort abgegeben werden." },
      { status: 409 },
    );
  }

  const { data: participant } = await admin
    .from("quiz_live_participants")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", auth.profile.id)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ detail: "Nicht in der Teilnehmerliste." }, { status: 403 });
  }

  const detail = await loadQuizDetail(admin, quizId);
  if (!detail) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  const sorted = [...detail.questions].sort((a, b) => a.sort_order - b.sort_order);
  const question = sorted[quiz.current_question_index];
  if (!question) {
    return NextResponse.json({ detail: "Keine aktive Frage." }, { status: 409 });
  }

  const choice = question.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return NextResponse.json({ detail: "Antwort gehört nicht zur aktuellen Frage." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("quiz_live_answers")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("question_id", question.id)
    .eq("user_id", auth.profile.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ detail: "Du hast diese Frage bereits beantwortet." }, { status: 409 });
  }

  if (!quiz.question_started_at) {
    return NextResponse.json({ detail: "Frage noch nicht gestartet." }, { status: 409 });
  }

  const answeredAt = new Date();
  const points = computePoints(
    choice.is_correct,
    answeredAt,
    quiz.question_started_at,
    quiz.seconds_per_question,
  );

  const { error: insertError } = await admin.from("quiz_live_answers").insert({
    quiz_id: quizId,
    question_id: question.id,
    user_id: auth.profile.id,
    choice_id: choiceId,
    is_correct: choice.is_correct,
    points,
    answered_at: answeredAt.toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ detail: insertError.message }, { status: 500 });
  }

  if (points > 0) {
    const { data: pRow } = await admin
      .from("quiz_live_participants")
      .select("total_score")
      .eq("quiz_id", quizId)
      .eq("user_id", auth.profile.id)
      .single();

    const prev = pRow ? Number((pRow as { total_score: number }).total_score) : 0;
    await admin
      .from("quiz_live_participants")
      .update({ total_score: prev + points })
      .eq("quiz_id", quizId)
      .eq("user_id", auth.profile.id);
  }

  return NextResponse.json({
    detail: "Antwort gespeichert.",
    choice_id: choiceId,
    points,
  });
}
