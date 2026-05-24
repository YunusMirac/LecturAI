import { API_URL } from "./config";

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
};

export type FetchCoursesResult = FetchCoursesSuccess | FetchCoursesFailure;

export type CreateCoursePayload = {
  name: string;
  semester?: string;
};

export type CreateCourseResult =
  | { ok: true; course: Course }
  | { ok: false; reason: "unauthorized" | "forbidden" | "http" | "network"; message?: string };

export async function createCourse(
  accessToken: string,
  payload: CreateCoursePayload,
): Promise<CreateCourseResult> {
  try {
    const res = await fetch(`${API_URL}/api/courses/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        semester: payload.semester?.trim() || null,
      }),
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => ({}));
      const msg = parseCourseWriteError(data);
      return { ok: false, reason: "http", message: msg };
    }
    const data: unknown = await res.json().catch(() => null);
    const course = parseCourse(data);
    if (!course) return { ok: false, reason: "http", message: "Unerwartete Antwort." };
    return { ok: true, course };
  } catch {
    return { ok: false, reason: "network" };
  }
}

function parseCourseWriteError(data: unknown): string {
  if (typeof data !== "object" || data === null) return "Kurs konnte nicht angelegt werden.";
  const o = data as Record<string, unknown>;
  const name = o.name;
  if (Array.isArray(name) && typeof name[0] === "string") return name[0];
  const detail = o.detail;
  if (typeof detail === "string") return detail;
  return "Kurs konnte nicht angelegt werden.";
}

export async function fetchCourses(accessToken: string): Promise<FetchCoursesResult> {
  try {
    const res = await fetch(`${API_URL}/api/courses/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 401) {
      return { ok: false, reason: "unauthorized" };
    }
    if (!res.ok) {
      return { ok: false, reason: "http" };
    }
    const data: unknown = await res.json().catch(() => null);
    if (!Array.isArray(data)) {
      return { ok: true, courses: [] };
    }
    const courses = data.map(parseCourse).filter((c): c is Course => c !== null);
    return { ok: true, courses };
  } catch {
    return { ok: false, reason: "network" };
  }
}

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
