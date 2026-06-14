import { createAdminClient } from "@/lib/server/api-helpers";
import {
  buildExamAttemptState,
  loadExamAttempt,
  maybeAutoSubmitExam,
  saveExamAnswer,
} from "@/lib/server/quiz-exam";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

function assertExamQuiz(quiz: { quiz_type?: string; status: string; exam_open?: boolean }) {
  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }
  if (quiz.status !== "published") {
    return NextResponse.json({ detail: "Klausur ist nicht veröffentlicht." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  const quiz = access.quiz as {
    quiz_type?: string;
    status: string;
    title: string;
    exam_open?: boolean;
  };
  const typeError = assertExamQuiz(quiz);
  if (typeError) return typeError;

  if (!access.canManage && !quiz.exam_open) {
    const admin = createAdminClient();
    let attempt = await loadExamAttempt(admin, quizId, access.profile.id);
    if (attempt) {
      attempt = await maybeAutoSubmitExam(admin, attempt);
    }
    if (attempt?.submit_reason !== "in_progress") {
      return NextResponse.json(
        { detail: "Der Lehrer hat diese Klausur noch nicht geöffnet." },
        { status: 403 },
      );
    }
  }

  const admin = createAdminClient();
  let attempt = await loadExamAttempt(admin, quizId, access.profile.id);
  if (attempt) {
    attempt = await maybeAutoSubmitExam(admin, attempt);
  }

  if (!attempt) {
    return NextResponse.json({
      quiz_id: quizId,
      title: quiz.title,
      has_attempt: false,
      exam_open: Boolean(quiz.exam_open),
    });
  }

  const state = await buildExamAttemptState(admin, quizId, attempt, quiz.title);
  if (!state) {
    return NextResponse.json({ detail: "Klausur konnte nicht geladen werden." }, { status: 500 });
  }

  return NextResponse.json({ has_attempt: true, state });
}

export async function POST(request: Request, context: RouteContext) {
  return NextResponse.json(
    { detail: "Bitte zuerst den Zugangscode auf der Beitrittsseite eingeben." },
    { status: 400 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  const quiz = access.quiz as { quiz_type?: string; status: string; title: string };
  const typeError = assertExamQuiz(quiz);
  if (typeError) return typeError;

  let body: { question_id?: string; choice_id?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (!body.question_id) {
    return NextResponse.json({ detail: "question_id fehlt." }, { status: 400 });
  }

  const admin = createAdminClient();
  let attempt = await loadExamAttempt(admin, quizId, access.profile.id);
  if (!attempt) {
    return NextResponse.json({ detail: "Klausur wurde noch nicht gestartet." }, { status: 404 });
  }

  attempt = await maybeAutoSubmitExam(admin, attempt);
  if (attempt.submit_reason !== "in_progress") {
    return NextResponse.json({ detail: "Klausur ist bereits abgeschickt." }, { status: 409 });
  }

  const saveResult = await saveExamAnswer(
    admin,
    attempt,
    body.question_id,
    body.choice_id ?? null,
  );
  if (!saveResult.ok) {
    return NextResponse.json({ detail: saveResult.message }, { status: 409 });
  }

  const state = await buildExamAttemptState(admin, quizId, attempt, quiz.title);
  return NextResponse.json({ state });
}
