import { API_URL } from "./config";
import { isRecord } from "./guards";

export type InvitationRole = "teacher" | "student";

export type CreateInvitationPayload = {
  email: string;
  role: InvitationRole;
  /** Pflicht bei role === "student" */
  course_id?: string | null;
};

export type CreateInvitationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errorMessage: string };

export async function postInvitation(
  accessToken: string,
  payload: CreateInvitationPayload,
): Promise<CreateInvitationResult> {
  try {
    const res = await fetch(`${API_URL}/api/invitations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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
    return { ok: true, data };
  } catch {
    return { ok: false, errorMessage: "Netzwerkfehler — läuft das Backend?" };
  }
}

function parseInvitationError(data: unknown): string {
  if (!isRecord(data)) return "Einladung fehlgeschlagen.";
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  const email = data.email;
  if (Array.isArray(email) && typeof email[0] === "string") return email[0];
  const course = data.course_id;
  if (Array.isArray(course) && typeof course[0] === "string") return course[0];
  return "Einladung fehlgeschlagen.";
}
