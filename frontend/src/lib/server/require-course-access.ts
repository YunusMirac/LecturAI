import {
  createAdminClient,
  getAuthenticatedProfile,
  type AuthProfile,
} from "@/lib/server/api-helpers";
import { loadCourseMembership } from "@/lib/server/access/course-membership";
import {
  isValidCourseId,
  type CourseRow,
} from "@/lib/server/course-access";
import {
  internalErrorResponse,
  missingServiceRoleResponse,
  notFoundResponse,
} from "@/lib/server/http-errors";
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
      error: missingServiceRoleResponse("requireCourseAccess"),
    };
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, teacher_id, name, semester, created_at")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    return {
      error: internalErrorResponse("requireCourseAccess", courseError),
    };
  }
  if (!course) {
    return {
      error: NextResponse.json({ detail: "Kurs nicht gefunden." }, { status: 404 }),
    };
  }

  const row = course as CourseRow;
  const membership = await loadCourseMembership(courseId, auth.profile.id, auth.profile.role);

  if (!membership) {
    return { error: notFoundResponse() };
  }

  return {
    ok: true,
    course: row,
    profile: auth.profile,
    canManage: membership.canManage,
  };
}
