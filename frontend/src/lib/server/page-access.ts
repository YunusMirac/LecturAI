import { createAdminClient, getAuthenticatedProfile } from "@/lib/server/api-helpers";
import { loadCourseMembership } from "@/lib/server/access/course-membership";
import { isValidCourseId } from "@/lib/server/course-access";
import { isValidQuizId } from "@/lib/server/require-managed-quiz";
import type { QuizType } from "@/lib/server/quiz-types";

export type CourseMemberAccess = {
  canManage: boolean;
};

export type QuizPageAccess = {
  quizType: QuizType | undefined;
  canManage: boolean;
};

export async function assertCourseMember(courseId: string): Promise<CourseMemberAccess | null> {
  if (!isValidCourseId(courseId)) return null;

  const auth = await getAuthenticatedProfile();
  if ("error" in auth) return null;

  return loadCourseMembership(courseId, auth.profile.id, auth.profile.role);
}

export async function assertCourseManager(courseId: string): Promise<boolean> {
  const access = await assertCourseMember(courseId);
  return access?.canManage === true;
}

type QuizInCourseOptions = {
  requireManage?: boolean;
  expectedQuizType?: QuizType;
};

export async function assertQuizInCourse(
  quizId: string,
  courseId: string,
  options: QuizInCourseOptions = {},
): Promise<QuizPageAccess | null> {
  if (!isValidQuizId(quizId) || !isValidCourseId(courseId)) return null;

  const auth = await getAuthenticatedProfile();
  if ("error" in auth) return null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select("id, course_id, quiz_type")
    .eq("id", quizId)
    .maybeSingle();

  if (quizError || !quiz) return null;

  const row = quiz as { id: string; course_id: string; quiz_type?: QuizType };
  if (row.course_id !== courseId) return null;

  const membership = await loadCourseMembership(courseId, auth.profile.id, auth.profile.role);
  if (!membership) return null;

  if (options.requireManage && !membership.canManage) return null;

  const quizType = row.quiz_type ?? "live";
  if (options.expectedQuizType && quizType !== options.expectedQuizType) return null;

  return { quizType, canManage: membership.canManage };
}

export async function assertQuizMember(quizId: string): Promise<boolean> {
  if (!isValidQuizId(quizId)) return false;

  const auth = await getAuthenticatedProfile();
  if ("error" in auth) return false;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return false;
  }

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select("course_id")
    .eq("id", quizId)
    .maybeSingle();

  if (quizError || !quiz) return false;

  const courseId = String((quiz as { course_id: string }).course_id);
  const membership = await loadCourseMembership(courseId, auth.profile.id, auth.profile.role);
  return membership !== null;
}
