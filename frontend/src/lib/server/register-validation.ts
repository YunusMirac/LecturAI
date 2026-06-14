export type RegisterBody = {
  invite_token?: string;
  email?: string;
  password?: string;
  password_confirm?: string;
};

export type RegisterValidationError = {
  status: 400;
  body: Record<string, string[] | string>;
};

export type RegisterValidationSuccess = {
  inviteToken: string;
  email: string;
  password: string;
};

export function validateRegisterBody(
  body: RegisterBody,
): RegisterValidationSuccess | RegisterValidationError {
  const inviteToken = body.invite_token?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const passwordConfirm = body.password_confirm ?? "";

  if (!inviteToken) {
    return {
      status: 400,
      body: { invite_token: ["Einladungstoken ist erforderlich."] },
    };
  }
  if (!email) {
    return { status: 400, body: { email: ["E-Mail ist erforderlich."] } };
  }
  if (password.length < 8) {
    return {
      status: 400,
      body: { password: ["Passwort muss mindestens 8 Zeichen haben."] },
    };
  }
  if (password !== passwordConfirm) {
    return {
      status: 400,
      body: { password_confirm: ["Passwörter stimmen nicht überein."] },
    };
  }

  return { inviteToken, email, password };
}

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  course_id: string | null;
  status: string;
  expires_at: string;
};

export function validateInvitationForRegister(
  inv: InvitationRow | null,
  email: string,
): { ok: true; profileRole: "teacher" | "student" } | RegisterValidationError {
  if (!inv) {
    return {
      status: 400,
      body: { invite_token: ["Ungültiges oder bereits verwendetes Einladungstoken."] },
    };
  }
  if (inv.status !== "pending") {
    return {
      status: 400,
      body: { invite_token: ["Ungültiges oder bereits verwendetes Einladungstoken."] },
    };
  }
  if (new Date(inv.expires_at) < new Date()) {
    return {
      status: 400,
      body: { invite_token: ["Die Einladung ist abgelaufen."] },
    };
  }
  if (inv.email.trim().toLowerCase() !== email) {
    return {
      status: 400,
      body: { email: ["E-Mail muss exakt der eingeladenen Adresse entsprechen."] },
    };
  }

  const profileRole = inv.role === "student" ? "student" : "teacher";
  return { ok: true, profileRole };
}
