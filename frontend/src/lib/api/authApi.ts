import { createClient } from "@/lib/supabase/client";
import type { ProfileRole, UserSession } from "@/lib/auth";
import { notifyAuthChanged } from "@/lib/auth";

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

export type RegisterSuccess = { ok: true; detail: string; emailSent?: boolean };
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
    if (typeof data === "object" && data !== null && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") return { ok: true, detail };
    }
    return { ok: true, detail: "Registrierung erfolgreich." };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler." };
  }
}

function parseRegisterError(data: unknown): string {
  if (typeof data !== "object" || data === null) return "Registrierung fehlgeschlagen.";
  const o = data as Record<string, unknown>;
  const invite = o.invite_token;
  if (Array.isArray(invite) && typeof invite[0] === "string") return invite[0];
  const email0 = o.email;
  if (Array.isArray(email0) && typeof email0[0] === "string") return email0[0];
  const pc = o.password_confirm;
  if (Array.isArray(pc) && typeof pc[0] === "string") return pc[0];
  const detail = o.detail;
  if (typeof detail === "string") return detail;
  return "Registrierung fehlgeschlagen.";
}
