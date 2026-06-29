import { createAdminClient } from "@/lib/server/api-helpers";
import {
  allocateFreshAccessCode,
  countExamAttempts,
  countQuestionsByDifficulty,
  loadQuizDetail,
} from "@/lib/server/quiz-db";
import { loadExamResults } from "@/lib/server/quiz-exam";
import { notFoundResponse } from "@/lib/server/http-errors";
import { requireQuizCourseAccess } from "@/lib/server/require-quiz-course-access";
import type { ExamConfig } from "@/lib/server/quiz-types";
import {
  parseExamConfig,
  resolveExamDuration,
  validateExamConfig,
} from "@/lib/server/quiz-validation";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";

type RouteContext = { params: Promise<{ quizId: string }> };

function parseConfigBody(body: {
  duration_minutes?: unknown;
  draw_easy?: unknown;
  draw_medium?: unknown;
  draw_hard?: unknown;
}): ExamConfig | null {
  const duration_minutes = Number(body.duration_minutes);
  const draw_counts = {
    easy: Number(body.draw_easy ?? 0),
    medium: Number(body.draw_medium ?? 0),
    hard: Number(body.draw_hard ?? 0),
  };
  if (
    !Number.isInteger(duration_minutes) ||
    !Number.isInteger(draw_counts.easy) ||
    !Number.isInteger(draw_counts.medium) ||
    !Number.isInteger(draw_counts.hard)
  ) {
    return null;
  }
  return {
    duration_seconds: duration_minutes * 60,
    draw_counts,
  };
}

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
    exam_config_json?: unknown;
  };

  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }

  const admin = createAdminClient();
  const detail = await loadQuizDetail(admin, quizId);
  const pool_counts = detail ? countQuestionsByDifficulty(detail.questions) : null;
  const exam_config = parseExamConfig(quiz.exam_config_json ?? detail?.exam_config_json);
  const results = access.canManage ? await loadExamResults(admin, quizId) : [];

  return NextResponse.json({
    quiz_id: quizId,
    title: quiz.title,
    status: quiz.status,
    exam_open: Boolean(quiz.exam_open),
    access_code: access.canManage ? quiz.access_code ?? null : undefined,
    can_manage: access.canManage,
    exam_config,
    pool_counts,
    duration_seconds: resolveExamDuration(exam_config),
    results,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  if (!access.canManage) {
    return notFoundResponse();
  }

  const quiz = access.quiz as { quiz_type?: string; status: string; exam_open?: boolean };
  if (quiz.quiz_type !== "exam") {
    return NextResponse.json({ detail: "Dies ist keine Klausur." }, { status: 400 });
  }
  if (quiz.exam_open) {
    return NextResponse.json(
      { detail: "Einstellungen können nicht geändert werden, solange die Klausur geöffnet ist." },
      { status: 409 },
    );
  }

  let body: {
    duration_minutes?: unknown;
    draw_easy?: unknown;
    draw_medium?: unknown;
    draw_hard?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const examConfig = parseConfigBody(body);
  if (!examConfig) {
    return NextResponse.json({ detail: "Ungültige Klausur-Einstellungen." }, { status: 400 });
  }

  const admin = createAdminClient();
  const detail = await loadQuizDetail(admin, quizId);
  if (!detail) {
    return NextResponse.json({ detail: "Klausur nicht gefunden." }, { status: 404 });
  }

  const attemptCount = await countExamAttempts(admin, quizId);
  if (attemptCount > 0) {
    return NextResponse.json(
      { detail: "Einstellungen können nicht mehr geändert werden — es gibt bereits Versuche." },
      { status: 409 },
    );
  }

  const poolCounts = countQuestionsByDifficulty(detail.questions);
  const validation = validateExamConfig(
    poolCounts,
    examConfig.draw_counts,
    examConfig.duration_seconds,
  );
  if (!validation.ok) {
    return NextResponse.json(validation.body, { status: 400 });
  }

  const { error } = await admin
    .from("quizzes")
    .update({ exam_config_json: examConfig })
    .eq("id", quizId);

  if (error) {
    return internalErrorResponse("exam", error);
  }

  return NextResponse.json({
    detail: "Klausur-Einstellungen gespeichert.",
    exam_config: examConfig,
    duration_seconds: examConfig.duration_seconds,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { quizId } = await context.params;
  const access = await requireQuizCourseAccess(request, quizId);
  if ("error" in access) return access.error;

  if (!access.canManage) {
    return notFoundResponse();
  }

  const quiz = access.quiz as {
    quiz_type?: string;
    status: string;
    exam_config_json?: unknown;
  };
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
    const detail = await loadQuizDetail(admin, quizId);
    if (!detail) {
      return NextResponse.json({ detail: "Klausur nicht gefunden." }, { status: 404 });
    }

    const poolCounts = countQuestionsByDifficulty(detail.questions);
    const examConfig = parseExamConfig(quiz.exam_config_json ?? detail.exam_config_json);
    const hasPoolSettings = Boolean(detail.settings_json.pool_counts);

    if (hasPoolSettings && !examConfig) {
      return NextResponse.json(
        {
          detail:
            "Bitte zuerst die Klausur-Einstellungen speichern (Zeitlimit und Fragenanzahl pro Schwierigkeit).",
        },
        { status: 409 },
      );
    }

    if (examConfig) {
      const validation = validateExamConfig(
        poolCounts,
        examConfig.draw_counts,
        examConfig.duration_seconds,
      );
      if (!validation.ok) {
        return NextResponse.json(
          {
            detail: "Klausur-Einstellungen unvollständig oder ungültig. Bitte zuerst konfigurieren.",
            ...validation.body,
          },
          { status: 409 },
        );
      }
    }

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
      return internalErrorResponse("exam", error);
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
    return internalErrorResponse("exam", error);
  }

  return NextResponse.json({
    detail: "Klausur geschlossen — niemand kann mehr beitreten. Ergebnisse bleiben einsehbar.",
    exam_open: false,
  });
}
