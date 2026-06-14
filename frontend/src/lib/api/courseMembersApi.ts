import { getAccessToken } from "@/lib/api/authApi";

export type CourseMember = {
  email: string;
  status: "registered" | "pending";
  student_id: string | null;
  joined_at: string | null;
  invited_at: string | null;
};

export type CourseMembersPayload = {
  course_id: string;
  course_name: string;
  members: CourseMember[];
  counts: {
    registered: number;
    pending: number;
    total: number;
  };
};

export type FetchCourseMembersResult =
  | { ok: true; data: CourseMembersPayload }
  | {
      ok: false;
      reason: "unauthorized" | "forbidden" | "not_found" | "http" | "network";
      message?: string;
    };

export type RemoveCourseMemberResult =
  | {
      ok: true;
      detail: string;
      removed_membership: boolean;
      revoked_invitation: boolean;
    }
  | {
      ok: false;
      reason: "unauthorized" | "forbidden" | "not_found" | "http" | "network";
      message?: string;
    };

function parseMember(row: unknown): CourseMember | null {
  if (typeof row !== "object" || row === null) return null;
  const o = row as Record<string, unknown>;
  if (typeof o.email !== "string") return null;
  if (o.status !== "registered" && o.status !== "pending") return null;
  return {
    email: o.email,
    status: o.status,
    student_id: typeof o.student_id === "string" ? o.student_id : null,
    joined_at: typeof o.joined_at === "string" ? o.joined_at : null,
    invited_at: typeof o.invited_at === "string" ? o.invited_at : null,
  };
}

export function parseCourseMembersPayload(data: unknown): CourseMembersPayload | null {
  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;
  if (typeof o.course_id !== "string" || typeof o.course_name !== "string") return null;
  if (!Array.isArray(o.members)) return null;

  const members = o.members.map(parseMember).filter((m): m is CourseMember => m !== null);
  if (members.length !== o.members.length) return null;
  const counts = o.counts;
  if (typeof counts !== "object" || counts === null) return null;
  const c = counts as Record<string, unknown>;
  if (
    typeof c.registered !== "number" ||
    typeof c.pending !== "number" ||
    typeof c.total !== "number"
  ) {
    return null;
  }

  return {
    course_id: o.course_id,
    course_name: o.course_name,
    members,
    counts: {
      registered: c.registered,
      pending: c.pending,
      total: c.total,
    },
  };
}

export async function fetchCourseMembers(courseId: string): Promise<FetchCourseMembersResult> {
  const id = courseId.trim();
  if (!id) {
    return { ok: false, reason: "http", message: "Kurs-ID fehlt." };
  }

  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, reason: "unauthorized" };

    const res = await fetch(`/api/courses/${encodeURIComponent(id)}/members`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (res.status === 404) return { ok: false, reason: "not_found" };

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : undefined;
      return { ok: false, reason: "http", message: detail };
    }

    const payload = parseCourseMembersPayload(data);
    if (!payload) return { ok: false, reason: "http", message: "Unerwartete Antwort." };
    return { ok: true, data: payload };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function removeCourseMember(
  courseId: string,
  email: string,
): Promise<RemoveCourseMemberResult> {
  const id = courseId.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!id) return { ok: false, reason: "http", message: "Kurs-ID fehlt." };
  if (!normalizedEmail) return { ok: false, reason: "http", message: "E-Mail fehlt." };

  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, reason: "unauthorized" };

    const res = await fetch(`/api/courses/${encodeURIComponent(id)}/members`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (res.status === 404) return { ok: false, reason: "not_found" };

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : "Entfernen fehlgeschlagen.";
      return { ok: false, reason: "http", message: detail };
    }

    if (typeof data !== "object" || data === null) {
      return { ok: false, reason: "http", message: "Unerwartete Antwort." };
    }
    const o = data as Record<string, unknown>;
    const detail = typeof o.detail === "string" ? o.detail : "Entfernt.";
    return {
      ok: true,
      detail,
      removed_membership: o.removed_membership === true,
      revoked_invitation: o.revoked_invitation === true,
    };
  } catch {
    return { ok: false, reason: "network" };
  }
}
