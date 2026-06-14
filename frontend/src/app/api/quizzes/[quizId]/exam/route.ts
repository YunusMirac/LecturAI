import { createAdminClient } from "@/lib/server/api-helpers";
import { allocateFreshAccessCode } from "@/lib/server/quiz-db";
import { loadExamResults } from "@/lib/server/quiz-exam";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ quizId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  const quiz = access.quiz as {
    quiz_type?: string;
    title: string;
    status: string;
    exam_open?: boolean;
    access_code?: string | null;
  };

  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }

  const admin = createAdminClient();
  const results = access.canManage ? await loadExamResults(admin, quizId) : [];

  return NextResponse.json({
    quiz_id: quizId,
    title: quiz.title,
    status: quiz.status,
    exam_open: Boolean(quiz.exam_open),
    access_code: access.canManage ? quiz.access_code ?? null : undefined,
    can_manage: access.canManage,
    results,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  if (!access.canManage) {
    return NextResponse.json({ detail: "Keine Berechtigung." }, { status: 403 });
  }

  const quiz = access.quiz as { quiz_type?: string; status: string };
  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }
  if (quiz.status !== "published") {
    return NextResponse.json(
      { detail: "Klausur muss zuerst veröffentlicht werden." },
      { status: 409 },
    );
  }

  let body: { action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  if (body.action !== "open" && body.action !== "close") {
    return NextResponse.json({ detail: "Unbekannte Aktion." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.action === "open") {
    const accessCode = await allocateFreshAccessCode(admin, quizId);
    if (!accessCode) {
      return NextResponse.json(
        { detail: "Zugangscode konnte nicht erzeugt werden." },
        { status: 500 },
      );
    }

    const { error } = await admin
      .from("quizzes")
      .update({ exam_open: true, access_code: accessCode })
      .eq("id", quizId);

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({
      detail: "Klausur für Schüler:innen geöffnet.",
      exam_open: true,
      access_code: accessCode,
    });
  }

  const { error } = await admin
    .from("quizzes")
    .update({ exam_open: false, access_code: null })
    .eq("id", quizId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    detail: "Klausur geschlossen — niemand kann mehr beitreten. Ergebnisse bleiben einsehbar.",
    exam_open: false,
  });
}
