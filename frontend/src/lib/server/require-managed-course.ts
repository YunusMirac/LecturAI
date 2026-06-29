import type { AuthProfile } from "@/lib/server/api-helpers";
import type { CourseRow } from "@/lib/server/course-access";
import { notFoundResponse } from "@/lib/server/http-errors";
import { requireCourseAccess } from "@/lib/server/require-course-access";
import { NextResponse } from "next/server";

type ManagedCourseResult =
  | { ok: true; course: CourseRow; profile: AuthProfile }
  | { error: NextResponse };

export async function requireManagedCourse(
  request: Request,
  courseId: string,
): Promise<ManagedCourseResult> {
  const access = await requireCourseAccess(request, courseId);
  if ("error" in access) return { error: access.error };

  if (!access.canManage) {
    return { error: notFoundResponse() };
  }

  return { ok: true, course: access.course, profile: access.profile };
}
