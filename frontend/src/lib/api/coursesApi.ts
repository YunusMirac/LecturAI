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
