import { createAdminClient } from "@/lib/server/api-helpers";
import { requireCourseAccess } from "@/lib/server/require-course-access";
import { requireManagedCourse } from "@/lib/server/require-managed-course";
import {
  buildPdfStoragePath,
  defaultQuizTitle,
} from "@/lib/server/quiz-db";
import { runQuizGenerationJob } from "@/lib/server/quiz-generation";
import type { QuizDifficulty, QuizSettings, QuizType } from "@/lib/server/quiz-types";
import {
  validateCreateQuizSettings,
} from "@/lib/server/quiz-validation";
import { after, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ courseId: string }> };

const MAX_PDF_BYTES =
  (Number(process.env.QUIZ_MAX_PDF_MB) || 15) * 1024 * 1024;

export async function GET(request: Request, context: RouteContext) {
  const { courseId } = await context.params;
  const access = await requireCourseAccess(request, courseId);
  if ("error" in access) return access.error;

  const admin = createAdminClient();
  let query = admin
    .from("quizzes")
    .select(
      "id, course_id, title, status, settings_json, generation_error, published_at, created_at, updated_at, live_open, live_status, quiz_type, exam_open",
    )
    .eq("course_id", courseId);

  if (!access.canManage) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const filtered = access.canManage
    ? rows
    : rows.filter((q) => {
        const row = q as { quiz_type?: string; live_open?: boolean; exam_open?: boolean };
        if (row.quiz_type === "exam") return Boolean(row.exam_open);
        return Boolean(row.live_open);
      });

  return NextResponse.json(filtered);
}

export async function POST(request: Request, context: RouteContext) {
  const { courseId } = await context.params;
  const managed = await requireManagedCourse(request, courseId);
  if ("error" in managed) return managed.error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Ungültiges Formular." }, { status: 400 });
  }

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ pdf: ["PDF-Datei ist erforderlich."] }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ pdf: ["Nur PDF-Dateien erlaubt."] }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { pdf: [`PDF darf maximal ${MAX_PDF_BYTES / (1024 * 1024)} MB groß sein.`] },
      { status: 400 },
    );
  }

  const settings: QuizSettings = {
    question_count: Number(formData.get("question_count") ?? 5),
    choice_count: Number(formData.get("choice_count") ?? 4),
    difficulty: (String(formData.get("difficulty") ?? "medium") as QuizDifficulty),
  };

  const settingsCheck = validateCreateQuizSettings(settings);
  if ("status" in settingsCheck) {
    return NextResponse.json(settingsCheck.body, { status: settingsCheck.status });
  }

  const titleInput = formData.get("title");
  const title =
    typeof titleInput === "string" && titleInput.trim()
      ? titleInput.trim()
      : defaultQuizTitle(managed.course.name);

  const quizTypeRaw = String(formData.get("quiz_type") ?? "live");
  const quiz_type: QuizType = quizTypeRaw === "exam" ? "exam" : "live";

  const admin = createAdminClient();
  const { data: quizRow, error: insertError } = await admin
    .from("quizzes")
    .insert({
      course_id: courseId,
      title,
      status: "generating",
      settings_json: settings,
      created_by: managed.profile.id,
      quiz_type,
    })
    .select("id")
    .single();

  if (insertError || !quizRow) {
    return NextResponse.json(
      { detail: insertError?.message ?? "Quiz konnte nicht angelegt werden." },
      { status: 500 },
    );
  }

  const quizId = (quizRow as { id: string }).id;
  const pdfPath = buildPdfStoragePath(courseId, quizId);
  const pdfBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("course-materials")
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    await admin.from("quizzes").delete().eq("id", quizId);
    return NextResponse.json({ detail: uploadError.message }, { status: 500 });
  }

  await admin.from("quizzes").update({ source_pdf_path: pdfPath }).eq("id", quizId);

  after(async () => {
    await runQuizGenerationJob(admin, quizId, pdfPath, settings);
  });

  return NextResponse.json(
    {
      quiz_id: quizId,
      status: "generating",
      detail: "Quiz wird erstellt. Bitte kurz warten…",
    },
    { status: 202 },
  );
}
