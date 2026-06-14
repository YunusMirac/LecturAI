import {
  createAdminClient,
  getAuthenticatedProfile,
  type AuthProfile,
} from "@/lib/server/api-helpers";
import {
  canManageCourse,
  isValidCourseId,
  type CourseRow,
} from "@/lib/server/course-access";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type ManagedCourseResult =
  | { ok: true; course: CourseRow; profile: AuthProfile }
  | { error: NextResponse };

export async function requireManagedCourse(
  request: Request,
  courseId: string,
): Promise<ManagedCourseResult> {
  if (!isValidCourseId(courseId)) {
    return {
      error: NextResponse.json({ detail: "Ungültige Kurs-ID." }, { status: 400 }),
    };
  }

  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) {
    return { error: auth.error };
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: NextResponse.json(
        { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
        { status: 500 },
      ),
    };
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, teacher_id, name, semester")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    return {
      error: NextResponse.json({ detail: courseError.message }, { status: 500 }),
    };
  }
  if (!course) {
    return {
      error: NextResponse.json({ detail: "Kurs nicht gefunden." }, { status: 404 }),
    };
  }

  const row = course as CourseRow;
  if (!canManageCourse(auth.profile.role, auth.profile.id, row.teacher_id)) {
    return {
      error: NextResponse.json(
        { detail: "Keine Berechtigung für diesen Kurs." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, course: row, profile: auth.profile };
}

export { createAdminClient };
