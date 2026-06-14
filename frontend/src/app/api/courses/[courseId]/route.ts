import {
  validateUpdateCourseBody,
} from "@/lib/server/course-access";
import {
  createAdminClient,
  requireManagedCourse,
} from "@/lib/server/require-managed-course";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { courseId } = await context.params;
  const managed = await requireManagedCourse(request, courseId);
  if ("error" in managed) return managed.error;

  let body: { name?: string; semester?: string | null };
  try {
    body = (await request.json()) as { name?: string; semester?: string | null };
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const validated = validateUpdateCourseBody(body);
  if ("status" in validated) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("courses")
    .update({
      name: validated.name,
      semester: validated.semester,
    })
    .eq("id", courseId)
    .select("id, name, semester, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { courseId } = await context.params;
  const managed = await requireManagedCourse(request, courseId);
  if ("error" in managed) return managed.error;

  const admin = createAdminClient();
  const { error } = await admin.from("courses").delete().eq("id", courseId);

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    detail: "Kurs gelöscht. Schüler:innen behalten ihre Konten.",
  });
}
