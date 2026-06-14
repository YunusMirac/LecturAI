import { authHeaders, parseApiDetail } from "@/lib/api/fetch-auth";

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

export type UpdateCoursePayload = {
  name: string;
  semester?: string | null;
};

export type UpdateCourseResult =
  | { ok: true; course: Course }
  | {
      ok: false;
      reason: "unauthorized" | "forbidden" | "not_found" | "http" | "network";
      message?: string;
    };

export type DeleteCourseResult =
  | { ok: true; detail: string }
  | {
      ok: false;
      reason: "unauthorized" | "forbidden" | "not_found" | "http" | "network";
      message?: string;
    };

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
      return { ok: false, reason: "http", message: parseApiDetail(data, "Kurs konnte nicht angelegt werden.") };
    }

    const course = parseCourse(data);
    if (!course) return { ok: false, reason: "http", message: "Unerwartete Antwort." };
    return { ok: true, course };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function updateCourse(
  courseId: string,
  payload: UpdateCoursePayload,
): Promise<UpdateCourseResult> {
  const id = courseId.trim();
  if (!id) return { ok: false, reason: "http", message: "Kurs-ID fehlt." };

  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, reason: "unauthorized" };

    const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        name: payload.name.trim(),
        semester: payload.semester?.trim() || null,
      }),
    });

    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (res.status === 404) return { ok: false, reason: "not_found" };

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, reason: "http", message: parseApiDetail(data, "Kurs konnte nicht gespeichert werden.") };
    }

    const course = parseCourse(data);
    if (!course) return { ok: false, reason: "http", message: "Unerwartete Antwort." };
    return { ok: true, course };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function deleteCourse(courseId: string): Promise<DeleteCourseResult> {
  const id = courseId.trim();
  if (!id) return { ok: false, reason: "http", message: "Kurs-ID fehlt." };

  try {
    const headers = await authHeaders();
    if (!headers) return { ok: false, reason: "unauthorized" };

    const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });

    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (res.status === 404) return { ok: false, reason: "not_found" };

    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, reason: "http", message: parseApiDetail(data, "Kurs konnte nicht gelöscht werden.") };
    }

    const detail =
      typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : "Kurs gelöscht.";
    return { ok: true, detail };
  } catch {
    return { ok: false, reason: "network" };
  }
}
