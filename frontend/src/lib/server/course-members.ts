import type { ProfileRole } from "@/lib/server/api-helpers";

import { canManageCourse, isValidCourseId } from "@/lib/server/course-access";

export type CourseMemberEntry = {
  email: string;
  status: "registered" | "pending";
  student_id: string | null;
  joined_at: string | null;
  invited_at: string | null;
};

export type RegisteredMember = {
  student_id: string;
  email: string;
  joined_at: string;
};

export type PendingInvitation = {
  email: string;
  created_at: string;
};

export { isValidCourseId };

export function canViewCourseMembers(
  role: ProfileRole,
  profileId: string,
  courseTeacherId: string,
): boolean {
  return canManageCourse(role, profileId, courseTeacherId);
}

export function mergeMembersAndInvitations(
  registered: RegisteredMember[],
  pendingInvites: PendingInvitation[],
): CourseMemberEntry[] {
  const byEmail = new Map<string, CourseMemberEntry>();

  for (const member of registered) {
    const email = member.email.trim().toLowerCase();
    byEmail.set(email, {
      email,
      status: "registered",
      student_id: member.student_id,
      joined_at: member.joined_at,
      invited_at: null,
    });
  }

  for (const invite of pendingInvites) {
    const email = invite.email.trim().toLowerCase();
    if (byEmail.has(email)) continue;
    byEmail.set(email, {
      email,
      status: "pending",
      student_id: null,
      joined_at: null,
      invited_at: invite.created_at,
    });
  }

  return Array.from(byEmail.values()).sort((a, b) => a.email.localeCompare(b.email));
}

export function parseRegisteredMember(row: unknown): RegisteredMember | null {
  if (typeof row !== "object" || row === null) return null;
  const o = row as Record<string, unknown>;
  if (typeof o.student_id !== "string" || typeof o.joined_at !== "string") return null;

  let email: string | null = null;
  const profile = o.profiles;
  if (typeof profile === "object" && profile !== null) {
    const p = profile as Record<string, unknown>;
    if (typeof p.email === "string") email = p.email;
  }
  if (!email && typeof o.email === "string") email = o.email;
  if (!email) return null;

  return { student_id: o.student_id, email, joined_at: o.joined_at };
}

export function memberStatusLabelDe(status: CourseMemberEntry["status"]): string {
  return status === "registered" ? "Registriert" : "Einladung offen";
}
