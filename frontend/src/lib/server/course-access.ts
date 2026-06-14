import type { ProfileRole } from "@/lib/server/api-helpers";

export type CourseRow = {
  id: string;
  teacher_id: string;
  name: string;
  semester: string | null;
  created_at?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCourseId(courseId: string): boolean {
  return UUID_RE.test(courseId.trim());
}

export function canManageCourse(
  role: ProfileRole,
  profileId: string,
  courseTeacherId: string,
): boolean {
  if (role === "admin") return true;
  if (role === "teacher") return profileId === courseTeacherId;
  return false;
}

export function validateUpdateCourseBody(body: {
  name?: string;
  semester?: string | null;
}):
  | { ok: true; name: string; semester: string | null }
  | { status: 400; body: Record<string, string[] | string> } {
  const name = body.name?.trim();
  if (!name) {
    return { status: 400, body: { name: ["Kursname ist erforderlich."] } };
  }
  return {
    ok: true,
    name,
    semester: body.semester?.trim() || null,
  };
}

export type RemoveMemberBody = {
  email?: string;
};

export function validateRemoveMemberBody(body: RemoveMemberBody):
  | { ok: true; email: string }
  | { status: 400; body: Record<string, string[] | string> } {
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: 400, body: { email: ["Gültige E-Mail ist erforderlich."] } };
  }
  return { ok: true, email };
}

export type RemoveMemberResult = {
  removed_membership: boolean;
  revoked_invitation: boolean;
};

export function buildRemoveMemberResult(
  membershipDeleted: boolean,
  invitationRevoked: boolean,
): RemoveMemberResult | null {
  if (!membershipDeleted && !invitationRevoked) return null;
  return {
    removed_membership: membershipDeleted,
    revoked_invitation: invitationRevoked,
  };
}

export function removeMemberDetailMessage(result: RemoveMemberResult): string {
  if (result.removed_membership && result.revoked_invitation) {
    return "Schüler:in aus Kurs entfernt und offene Einladung widerrufen.";
  }
  if (result.removed_membership) {
    return "Schüler:in aus dem Kurs entfernt. Das Login-Konto bleibt bestehen.";
  }
  return "Offene Einladung widerrufen.";
}
