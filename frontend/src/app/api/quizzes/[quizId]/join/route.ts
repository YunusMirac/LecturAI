import { createAdminClient } from "@/lib/server/api-helpers";
import { normalizeAccessCode } from "@/lib/server/quiz-access-code";
import { loadExamAttempt, maybeAutoSubmitExam, startExamAttempt } from "@/lib/server/quiz-exam";
import {
  assertExamOpenForStudent,
  assertJoinableExamQuiz,
  assertJoinableLiveQuiz,
  assertJoinableLiveStatus,
  assertLiveOpenForStudent,
  assertMatchingAccessCode,
  assertPublishedQuiz,
  hasLiveParticipant,
  joinAccessCodeError,
  type LiveQuizJoinRow,
  upsertLiveParticipant,
} from "@/lib/server/quiz-live-join";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

function asJoinRow(quiz: Record<string, unknown>): LiveQuizJoinRow {
  return {
    id: String(quiz.id),
    title: String(quiz.title),
    course_id: String(quiz.course_id),
    status: String(quiz.status),
    access_code: typeof quiz.access_code === "string" ? quiz.access_code : null,
    live_open: Boolean(quiz.live_open),
    live_status: typeof quiz.live_status === "string" ? quiz.live_status : "idle",
    quiz_type: typeof quiz.quiz_type === "string" ? quiz.quiz_type : "live",
    exam_open: Boolean(quiz.exam_open),
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  const quiz = asJoinRow(access.quiz as Record<string, unknown>);
  const publishedError = assertPublishedQuiz(quiz);
  if (publishedError) return publishedError;

  if (quiz.quiz_type === "exam") {
    const admin = createAdminClient();
    let attempt = await loadExamAttempt(admin, quizId, access.profile.id);
    if (attempt) {
      attempt = await maybeAutoSubmitExam(admin, attempt);
    }

    const inProgress = attempt?.submit_reason === "in_progress";
    if (!access.canManage && !quiz.exam_open && !inProgress) {
      const openError = assertExamOpenForStudent({ exam_open: quiz.exam_open }, false);
      if (openError) return openError;
    }

    return NextResponse.json({
      quiz_id: quiz.id,
      course_id: quiz.course_id,
      title: quiz.title,
      quiz_type: "exam",
      exam_open: quiz.exam_open,
      has_attempt: Boolean(attempt),
      in_progress: inProgress,
      already_submitted: Boolean(attempt && attempt.submit_reason !== "in_progress"),
    });
  }

  const liveError = assertLiveOpenForStudent(quiz, access.canManage);
  if (liveError) return liveError;

  const admin = createAdminClient();
  const alreadyJoined = await hasLiveParticipant(admin, quizId, access.profile.id);

  return NextResponse.json({
    quiz_id: quiz.id,
    course_id: quiz.course_id,
    title: quiz.title,
    quiz_type: "live",
    live_open: quiz.live_open,
    live_status: quiz.live_status,
    already_joined: alreadyJoined,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  const quiz = asJoinRow(access.quiz as Record<string, unknown>);
  const publishedError = assertPublishedQuiz(quiz);
  if (publishedError) return publishedError;

  let body: { access_code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const code = normalizeAccessCode(body.access_code ?? "");
  const codeError = joinAccessCodeError(code);
  if (codeError) return codeError;

  const admin = createAdminClient();

  if (quiz.quiz_type === "exam") {
    let attempt = await loadExamAttempt(admin, quizId, access.profile.id);
    if (attempt) {
      attempt = await maybeAutoSubmitExam(admin, attempt);
    }

    if (attempt && attempt.submit_reason !== "in_progress") {
      return NextResponse.json({ detail: "Du hast diese Klausur bereits abgeschickt." }, { status: 409 });
    }

    if (attempt?.submit_reason === "in_progress") {
      return NextResponse.json({
        quiz_id: quiz.id,
        title: quiz.title,
        quiz_type: "exam",
        detail: "Klausur wird fortgesetzt.",
      });
    }

    for (const check of [
      () => assertJoinableExamQuiz(quiz),
      () => assertMatchingAccessCode(quiz, code),
    ]) {
      const error = check();
      if (error) return error;
    }

    const result = await startExamAttempt(
      admin,
      quizId,
      access.profile.id,
      access.profile.email,
      quiz.title,
    );

    if (!result.ok) {
      return NextResponse.json({ detail: result.message }, { status: 409 });
    }

    return NextResponse.json({
      quiz_id: quiz.id,
      title: quiz.title,
      quiz_type: "exam",
      detail: "Klausur gestartet. Viel Erfolg!",
    });
  }

  for (const check of [
    () => assertJoinableLiveQuiz(quiz),
    () => assertMatchingAccessCode(quiz, code),
    () => assertJoinableLiveStatus(quiz),
  ]) {
    const error = check();
    if (error) return error;
  }

  const joinError = await upsertLiveParticipant(admin, quiz.id, access.profile);
  if (joinError) return joinError;

  return NextResponse.json({
    quiz_id: quiz.id,
    title: quiz.title,
    quiz_type: "live",
    detail: "Du bist in der Warteliste. Warte, bis der Lehrer startet.",
  });
}
