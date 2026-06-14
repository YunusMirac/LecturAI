import { createClient } from "@/lib/supabase/client";
import type { ProfileRole, UserSession } from "@/lib/auth";
import { notifyAuthChanged } from "@/lib/auth";
import {
  passwordValidationErrorMessage,
  validateForgotPasswordEmail,
  validatePasswordFields,
} from "@/lib/server/password-validation";

export type AuthTokenSuccess = {
  ok: true;
  email: string;
  role: ProfileRole | null;
};

export type AuthTokenFailure = {
  ok: false;
  errorMessage: string;
};

export type AuthTokenResult = AuthTokenSuccess | AuthTokenFailure;

export type InvitationPreview = {
  email: string;
  role: "teacher" | "student";
  expires_at: string;
};

export type FetchInvitationPreviewResult =
  | { ok: true; preview: InvitationPreview }
  | { ok: false; errorMessage: string };

export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authHeaders(): Promise<HeadersInit | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthTokenResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return {
        ok: false,
        errorMessage: error.message.includes("Invalid")
          ? "Kein Konto mit dieser E-Mail oder falsches Passwort."
          : error.message,
      };
    }

    if (!data.user) {
      return { ok: false, errorMessage: "Anmeldung fehlgeschlagen." };
    }

    notifyAuthChanged();

    const token = data.session?.access_token;
    if (token) {
      const meRes = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const profile = (await meRes.json()) as { email: string; role: ProfileRole };
        return {
          ok: true,
          email: profile.email,
          role: profile.role,
        };
      }
      const err = (await meRes.json().catch(() => ({}))) as { detail?: string };
      return {
        ok: false,
        errorMessage:
          typeof err.detail === "string"
            ? err.detail
            : "Login ok, aber kein Profil in der Datenbank.",
      };
    }

    return {
      ok: true,
      email: data.user.email ?? email,
      role: null,
    };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler — ist Supabase erreichbar?" };
  }
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  notifyAuthChanged();
}

export async function getSession(): Promise<UserSession | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const headers = await authHeaders();
  if (!headers) {
    return { userId: user.id, email: user.email ?? null, role: null };
  }

  try {
    const res = await fetch("/api/me", { headers, cache: "no-store" });
    if (!res.ok) {
      return { userId: user.id, email: user.email ?? null, role: null };
    }
    const profile = (await res.json()) as { email: string; role: ProfileRole };
    return {
      userId: user.id,
      email: profile.email ?? user.email ?? null,
      role: profile.role ?? null,
    };
  } catch {
    return { userId: user.id, email: user.email ?? null, role: null };
  }
}

export async function fetchInvitationPreview(
  inviteToken: string,
): Promise<FetchInvitationPreviewResult> {
  const token = inviteToken.trim();
  if (!token) {
    return { ok: false, errorMessage: "Einladungstoken fehlt." };
  }

  try {
    const res = await fetch(
      `/api/invitations/preview?token=${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : "Ungültige oder abgelaufene Einladung.";
      return { ok: false, errorMessage: detail };
    }
    if (
      typeof data === "object" &&
      data !== null &&
      "email" in data &&
      "role" in data &&
      typeof (data as { email: unknown }).email === "string" &&
      ((data as { role: unknown }).role === "teacher" ||
        (data as { role: unknown }).role === "student")
    ) {
      return {
        ok: true,
        preview: data as InvitationPreview,
      };
    }
    return { ok: false, errorMessage: "Unerwartete Antwort vom Server." };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler." };
  }
}

export type RegisterSuccess = { ok: true; detail: string; email: string };
export type RegisterFailure = { ok: false; errorMessage: string };
export type RegisterResult = RegisterSuccess | RegisterFailure;

export async function postRegister(payload: {
  inviteToken: string;
  email: string;
  password: string;
  passwordConfirm: string;
}): Promise<RegisterResult> {
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invite_token: payload.inviteToken.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        password_confirm: payload.passwordConfirm,
      }),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, errorMessage: parseRegisterError(data) };
    }
    const email =
      typeof data === "object" &&
      data !== null &&
      "email" in data &&
      typeof (data as { email: unknown }).email === "string"
        ? (data as { email: string }).email
        : payload.email.trim().toLowerCase();
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : "Registrierung erfolgreich.";
    return { ok: true, detail, email };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler." };
  }
}

export function parseRegisterError(data: unknown): string {
  if (typeof data !== "object" || data === null) return "Registrierung fehlgeschlagen.";
  const o = data as Record<string, unknown>;
  const invite = o.invite_token;
  if (Array.isArray(invite) && typeof invite[0] === "string") return invite[0];
  const email0 = o.email;
  if (Array.isArray(email0) && typeof email0[0] === "string") return email0[0];
  const password = o.password;
  if (Array.isArray(password) && typeof password[0] === "string") return password[0];
  const pc = o.password_confirm;
  if (Array.isArray(pc) && typeof pc[0] === "string") return pc[0];
  const detail = o.detail;
  if (typeof detail === "string") return detail;
  return "Registrierung fehlgeschlagen.";
}

export type PasswordResetRequestResult =
  | { ok: true; detail: string }
  | { ok: false; errorMessage: string };

export type PasswordUpdateResult =
  | { ok: true; detail: string }
  | { ok: false; errorMessage: string };

export function buildPasswordResetRedirectUrl(origin: string): string {
  const next = encodeURIComponent("/reset-password");
  return `${origin.replace(/\/$/, "")}/auth/callback?next=${next}`;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
  const validated = validateForgotPasswordEmail(email);
  if ("status" in validated) {
    return { ok: false, errorMessage: passwordValidationErrorMessage(validated.body) };
  }

  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: validated.email }),
    });

    const data: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : typeof data === "object" &&
              data !== null &&
              "email" in data &&
              Array.isArray((data as { email: unknown }).email) &&
              typeof (data as { email: string[] }).email[0] === "string"
            ? (data as { email: string[] }).email[0]
            : "Passwort-Reset konnte nicht angefordert werden.";
      return { ok: false, errorMessage: detail };
    }

    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : "Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze eine E-Mail mit einem Link zum Zurücksetzen.";

    return { ok: true, detail };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler — ist der Server erreichbar?" };
  }
}

export async function updatePasswordAfterReset(
  password: string,
  passwordConfirm: string,
): Promise<PasswordUpdateResult> {
  const validated = validatePasswordFields(password, passwordConfirm);
  if ("status" in validated) {
    return { ok: false, errorMessage: passwordValidationErrorMessage(validated.body) };
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        ok: false,
        errorMessage: "Der Link ist ungültig oder abgelaufen. Bitte erneut anfordern.",
      };
    }

    const { error } = await supabase.auth.updateUser({ password: validated.password });
    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    await supabase.auth.signOut();
    notifyAuthChanged();
    return { ok: true, detail: "Passwort gespeichert. Du kannst dich jetzt anmelden." };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler — ist Supabase erreichbar?" };
  }
}

export async function hasPasswordRecoverySession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return Boolean(session);
  } catch {
    return false;
  }
}
