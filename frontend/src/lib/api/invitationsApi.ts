import { getAccessToken } from "@/lib/api/authApi";
import { isRecord } from "./guards";

export type InvitationRole = "teacher" | "student";

export type CreateInvitationPayload = {
  email: string;
  role: InvitationRole;
  course_id?: string | null;
};

export type CreateInvitationResult =
  | {
      ok: true;
      data: Record<string, unknown>;
      emailSent: boolean;
      registerUrl: string | null;
      addedDirectly: boolean;
    }
  | { ok: false; errorMessage: string };

export async function postInvitation(
  payload: CreateInvitationPayload,
): Promise<CreateInvitationResult> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, errorMessage: "Nicht angemeldet." };
  }

  try {
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        role: payload.role,
        course_id: payload.course_id ?? null,
      }),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, errorMessage: parseInvitationError(data) };
    }
    if (!isRecord(data)) {
      return { ok: false, errorMessage: "Unerwartete Antwort vom Server." };
    }
    const emailSent = data.email_sent === true;
    const registerUrl = typeof data.register_url === "string" ? data.register_url : null;
    const addedDirectly = data.added_directly === true;
    return { ok: true, data, emailSent, registerUrl, addedDirectly };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler." };
  }
}

export function parseInvitationError(data: unknown): string {
  if (!isRecord(data)) return "Einladung fehlgeschlagen.";
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  const email = data.email;
  if (Array.isArray(email) && typeof email[0] === "string") return email[0];
  const course = data.course_id;
  if (Array.isArray(course) && typeof course[0] === "string") return course[0];
  return "Einladung fehlgeschlagen.";
}
