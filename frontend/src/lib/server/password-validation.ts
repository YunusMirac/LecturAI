export type PasswordValidationError = {
  status: 400;
  body: Record<string, string[]>;
};

export type PasswordValidationSuccess = {
  password: string;
};

export function validatePasswordFields(
  password: string,
  passwordConfirm: string,
): PasswordValidationSuccess | PasswordValidationError {
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
  return { password };
}

export function validateForgotPasswordEmail(
  email: string,
): { ok: true; email: string } | PasswordValidationError {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return {
      status: 400,
      body: { email: ["Gültige E-Mail ist erforderlich."] },
    };
  }
  return { ok: true, email: normalized };
}

export function passwordValidationErrorMessage(
  body: Record<string, string[]>,
): string {
  const password = body.password?.[0];
  if (password) return password;
  const confirm = body.password_confirm?.[0];
  if (confirm) return confirm;
  const email = body.email?.[0];
  if (email) return email;
  return "Eingabe ungültig.";
}
