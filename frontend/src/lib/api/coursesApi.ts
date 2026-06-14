import { getAccessToken } from "@/lib/api/authApi";

export type Course = {
  id: string;
  name: string;
  semester: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FetchCoursesSuccess = { ok: true; courses: Course[] };
export type FetchCoursesFailure = {
  ok: false;
  reason: "unauthorized" | "http" | "network";
  message?: string;
};

export type FetchCoursesResult = FetchCoursesSuccess | FetchCoursesFailure;

export type CreateCoursePayload = {
  name: string;
  semester?: string;
};

export type CreateCourseResult =
  | { ok: true; course: Course }
  | { ok: false; reason: "unauthorized" | "forbidden" | "http" | "network"; message?: string };

function parseCourse(row: unknown): Course | null {
  if (typeof row !== "object" || row === null) return null;
  const o = row as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  return {
    id: o.id,
    name: o.name,
    semester: typeof o.semester === "string" ? o.semester : null,
    created_at: typeof o.created_at === "string" ? o.created_at : undefined,
    updated_at: typeof o.updated_at === "string" ? o.updated_at : undefined,
  };
}

async function authHeaders(): Promise<HeadersInit | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchCourses(): Promise<FetchCoursesResult> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, reason: "unauthorized" };

    const res = await fetch("/api/courses", { headers, cache: "no-store" });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      return {
        ok: false,
        reason: "http",
        message: typeof data.detail === "string" ? data.detail : undefined,
      };
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return { ok: true, courses: [] };
    const courses = data.map(parseCourse).filter((c): c is Course => c !== null);
    return { ok: true, courses };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function createCourse(payload: CreateCoursePayload): Promise<CreateCourseResult> {
  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, reason: "unauthorized" };

    const res = await fetch("/api/courses", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: payload.name.trim(),
        semester: payload.semester?.trim() || null,
      }),
    });

    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof data === "object" &&
        data !== null &&
        "detail" in data &&
        typeof (data as { detail: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : "Kurs konnte nicht angelegt werden.";
      return { ok: false, reason: "http", message: msg };
    }

    const course = parseCourse(data);
    if (!course) return { ok: false, reason: "http", message: "Unerwartete Antwort." };
    return { ok: true, course };
  } catch {
    return { ok: false, reason: "network" };
  }
}
