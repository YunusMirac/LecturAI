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

type CourseAccessResult =
  | { ok: true; course: CourseRow; profile: AuthProfile; canManage: boolean }
  | { error: NextResponse };

export async function requireCourseAccess(
  request: Request,
  courseId: string,
): Promise<CourseAccessResult> {
  if (!isValidCourseId(courseId)) {
    return {
      error: NextResponse.json({ detail: "Ungültige Kurs-ID." }, { status: 400 }),
    };
  }

  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) {
    return { error: auth.error };
  }

  let admin;
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
    .select("id, teacher_id, name, semester, created_at")
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

  const { data: membership } = await admin
    .from("course_members")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("student_id", auth.profile.id)
    .maybeSingle();

  const isMember =
    auth.profile.role === "admin" ||
    row.teacher_id === auth.profile.id ||
    membership !== null;

  if (!isMember) {
    return {
      error: NextResponse.json({ detail: "Kein Zugriff auf diesen Kurs." }, { status: 403 }),
    };
  }

  return {
    ok: true,
    course: row,
    profile: auth.profile,
    canManage: canManageCourse(auth.profile.role, auth.profile.id, row.teacher_id),
  };
}
