import { API_URL } from "./config";
import { isRecord } from "./guards";

export type AuthTokenSuccess = {
  ok: true;
  access: string;
  refresh: string;
  email: string;
  /** `admin` | `teacher` | `student` oder null ohne Profilzeile */
  role: string | null;
};

export type AuthTokenFailure = {
  ok: false;
  errorMessage: string;
};

export type AuthTokenResult = AuthTokenSuccess | AuthTokenFailure;

export async function postAuthToken(email: string, password: string): Promise<AuthTokenResult> {
  try {
    const res = await fetch(`${API_URL}/api/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMessage = parseAuthTokenError(data);
      return { ok: false, errorMessage };
    }
    if (!isRecord(data)) {
      return { ok: false, errorMessage: "Unerwartete Antwort vom Server." };
    }
    const access = data.access;
    const refresh = data.refresh;
    if (typeof access === "string" && typeof refresh === "string") {
      const email = typeof data.email === "string" ? data.email : "";
      const role: string | null =
        data.role == null
          ? null
          : typeof data.role === "string"
            ? data.role
            : null;
      return { ok: true, access, refresh, email, role };
    }
    return { ok: false, errorMessage: "Unerwartete Antwort vom Server." };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler — läuft das Backend?" };
  }
}

function parseAuthTokenError(data: unknown): string {
  if (!isRecord(data)) return "Anmeldung fehlgeschlagen.";
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  const nfe = data.non_field_errors;
  if (Array.isArray(nfe) && typeof nfe[0] === "string") return nfe[0];
  return "Anmeldung fehlgeschlagen.";
}

export type RegisterSuccess = {
  ok: true;
  detail: string;
};

export type RegisterFailure = {
  ok: false;
  errorMessage: string;
};

export type RegisterResult = RegisterSuccess | RegisterFailure;

export async function postRegister(payload: {
  inviteToken: string;
  email: string;
  password: string;
  passwordConfirm: string;
}): Promise<RegisterResult> {
  try {
    const res = await fetch(`${API_URL}/api/auth/register/`, {
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
    if (!isRecord(data)) {
      return {
        ok: true,
        detail: "Registrierung erfolgreich.",
      };
    }
    const detail =
      typeof data.detail === "string" ? data.detail : "Registrierung erfolgreich.";
    return { ok: true, detail };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler — läuft das Backend?" };
  }
}

function parseRegisterError(data: unknown): string {
  if (!isRecord(data)) return "Registrierung fehlgeschlagen.";
  const invite = data.invite_token;
  if (Array.isArray(invite) && typeof invite[0] === "string") return invite[0];
  const email0 = data.email;
  if (Array.isArray(email0) && typeof email0[0] === "string") return email0[0];
  const pc = data.password_confirm;
  if (Array.isArray(pc) && typeof pc[0] === "string") return pc[0];
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  return "Registrierung fehlgeschlagen.";
}
