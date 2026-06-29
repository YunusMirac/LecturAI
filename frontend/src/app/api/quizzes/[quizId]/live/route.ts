import { createAdminClient } from "@/lib/server/api-helpers";
import { allocateFreshAccessCode } from "@/lib/server/quiz-db";
import { buildLiveHostState, fetchLiveQuizRow } from "@/lib/server/quiz-live";
import { requireManagedQuiz } from "@/lib/server/require-managed-quiz";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  const admin = createAdminClient();
  const quiz = await fetchLiveQuizRow(admin, quizId);
  if (!quiz) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  const state = await buildLiveHostState(admin, quiz);
  if (!state) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(state);
}

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const managed = await requireManagedQuiz(request, quizId);
  if ("error" in managed) return managed.error;

  if (managed.quiz.status !== "published") {
    return NextResponse.json(
      { detail: "Quiz muss zuerst veröffentlicht sein." },
      { status: 409 },
    );
  }

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const quiz = await fetchLiveQuizRow(admin, quizId);
  if (!quiz) {
    return NextResponse.json({ detail: "Quiz nicht gefunden." }, { status: 404 });
  }

  const action = body.action;

  if (action === "open") {
    await admin.from("quiz_live_answers").delete().eq("quiz_id", quizId);
    await admin.from("quiz_live_participants").delete().eq("quiz_id", quizId);

    const accessCode = await allocateFreshAccessCode(admin, quizId);
    if (!accessCode) {
      return NextResponse.json({ detail: "Zugangscode konnte nicht erzeugt werden." }, { status: 500 });
    }

    const { error } = await admin
      .from("quizzes")
      .update({
        live_open: true,
        live_status: "lobby",
        access_code: accessCode,
        current_question_index: 0,
        question_started_at: null,
        reveal_ends_at: null,
        seconds_per_question: 30,
      })
      .eq("id", quizId);

    if (error) return internalErrorResponse("live", error);

    return NextResponse.json({
      detail: "Quiz für Schüler geöffnet.",
      access_code: accessCode,
      live_status: "lobby",
    });
  }

  if (action === "close") {
    const { error } = await admin
      .from("quizzes")
      .update({ live_open: false, live_status: "closed", access_code: null })
      .eq("id", quizId);
    if (error) return internalErrorResponse("live", error);
    return NextResponse.json({ detail: "Live-Quiz geschlossen.", live_open: false });
  }

  if (action === "start") {
    if (quiz.live_status !== "lobby") {
      return NextResponse.json(
        { detail: "Quiz kann nur aus der Warteliste gestartet werden." },
        { status: 409 },
      );
    }

    const { count } = await admin
      .from("quiz_live_participants")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);

    if ((count ?? 0) === 0) {
      return NextResponse.json(
        { detail: "Mindestens ein Schüler muss den Code eingegeben haben." },
        { status: 400 },
      );
    }

    const { count: qCount } = await admin
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);

    if ((qCount ?? 0) === 0) {
      return NextResponse.json({ detail: "Quiz hat keine Fragen." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await admin
      .from("quizzes")
      .update({
        live_status: "question",
        current_question_index: 0,
        question_started_at: now,
        reveal_ends_at: null,
      })
      .eq("id", quizId);

    if (error) return internalErrorResponse("live", error);
    return NextResponse.json({ detail: "Quiz gestartet!", live_status: "question" });
  }

  if (action === "reset") {
    await admin.from("quiz_live_answers").delete().eq("quiz_id", quizId);
    await admin.from("quiz_live_participants").delete().eq("quiz_id", quizId);
    const { error } = await admin
      .from("quizzes")
      .update({
        live_open: false,
        live_status: "idle",
        access_code: null,
        current_question_index: 0,
        question_started_at: null,
        reveal_ends_at: null,
      })
      .eq("id", quizId);
    if (error) return internalErrorResponse("live", error);
    return NextResponse.json({ detail: "Live-Runde zurückgesetzt." });
  }

  return NextResponse.json({ detail: "Unbekannte Aktion." }, { status: 400 });
}
