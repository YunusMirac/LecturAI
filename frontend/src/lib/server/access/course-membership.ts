import { createAdminClient } from "@/lib/server/api-helpers";
import type { ProfileRole } from "@/lib/server/api-helpers";
import { canManageCourse, isValidCourseId } from "@/lib/server/course-access";

export type CourseMembership = {
  canManage: boolean;
};

export async function loadCourseMembership(
  courseId: string,
  profileId: string,
  role: ProfileRole,
): Promise<CourseMembership | null> {
  if (!isValidCourseId(courseId)) return null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, teacher_id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) return null;

  const teacherId = String((course as { teacher_id: string }).teacher_id);
  if (canManageCourse(role, profileId, teacherId)) {
    return { canManage: true };
  }

  const { data: membership } = await admin
    .from("course_members")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("student_id", profileId)
    .maybeSingle();

  if (membership) return { canManage: false };
  if (teacherId === profileId) return { canManage: true };

  return null;
}
