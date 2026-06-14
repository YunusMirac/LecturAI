import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthProfile } from "@/lib/server/api-helpers";

export type ExistingProfile = Pick<AuthProfile, "id" | "email" | "role">;

export async function findProfileByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<ExistingProfile | null> {
  const normalized = email.trim().toLowerCase();
  const { data } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("email", normalized)
    .maybeSingle();

  return data ? (data as ExistingProfile) : null;
}

export async function isCourseMember(
  admin: SupabaseClient,
  courseId: string,
  studentId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("course_members")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .maybeSingle();

  return Boolean(data);
}

export async function addStudentToCourse(
  admin: SupabaseClient,
  courseId: string,
  studentId: string,
): Promise<void> {
  const { error } = await admin.from("course_members").insert({
    course_id: courseId,
    student_id: studentId,
    joined_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function acceptPendingInvitationsForCourse(
  admin: SupabaseClient,
  courseId: string,
  email: string,
): Promise<void> {
  const now = new Date().toISOString();
  await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: now })
    .eq("course_id", courseId)
    .eq("email", email.trim().toLowerCase())
    .eq("status", "pending");
}

export function canInviteEmailAsStudent(profile: ExistingProfile): boolean {
  return profile.role === "student";
}
