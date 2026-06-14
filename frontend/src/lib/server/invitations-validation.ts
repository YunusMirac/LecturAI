export type InvitationBody = {
  email?: string;
  role?: "teacher" | "student";
  course_id?: string | null;
};

export type InvitationValidationError = {
  status: 400 | 403;
  body: Record<string, string[] | string>;
};

export type InvitationValidationSuccess = {
  email: string;
  role: "teacher" | "student";
  courseId: string | null;
};

export function validateInvitationRequest(
  body: InvitationBody,
  profileRole: "admin" | "teacher" | "student",
): InvitationValidationSuccess | InvitationValidationError {
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  const courseId = body.course_id ?? null;

  if (!email || !email.includes("@")) {
    return { status: 400, body: { email: ["Gültige E-Mail erforderlich."] } };
  }
  if (role !== "teacher" && role !== "student") {
    return { status: 400, body: { role: ["role muss teacher oder student sein."] } };
  }

  if (role === "teacher") {
    if (profileRole !== "admin") {
      return { status: 403, body: { detail: "Nur Admins dürfen Lehrkräfte einladen." } };
    }
    if (courseId) {
      return {
        status: 400,
        body: { course_id: ["Bei Lehrer-Einladungen darf kein Kurs angegeben werden."] },
      };
    }
  }

  if (role === "student") {
    if (profileRole !== "teacher") {
      return {
        status: 403,
        body: { detail: "Nur Lehrkräfte dürfen Schüler:innen einladen." },
      };
    }
    if (!courseId) {
      return {
        status: 400,
        body: { course_id: ["Für Schüler:innen-Einladungen ist course_id erforderlich."] },
      };
    }
  }

  return { email, role, courseId };
}

export function validateCreateCourseBody(body: {
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

export function canCreateCourse(role: string): boolean {
  return role === "teacher" || role === "admin";
}
