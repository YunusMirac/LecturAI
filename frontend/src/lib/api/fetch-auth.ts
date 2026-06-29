import { getAccessToken } from "@/lib/api/authApi";

export type ApiFail = { ok: false; message: string; notFound?: boolean };
export type ApiOk<T> = { ok: true; data: T };
export type ApiResult<T> = ApiOk<T> | ApiFail;

export function parseApiDetail(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export async function authHeaders(json = true): Promise<HeadersInit | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };
  if (json) (headers as Record<string, string>)["Content-Type"] = "application/json";
  return headers;
}

type ApiFetchOptions = RequestInit & {
  fallback?: string;
  json?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  const { fallback = "Anfrage fehlgeschlagen.", json = true, ...init } = options;
  try {
    const headers = await authHeaders(json);
    if (!headers) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(path, {
      cache: "no-store",
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message: parseApiDetail(data, fallback),
        notFound: res.status === 404,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}

export async function apiFetchForm<T>(
  path: string,
  body: FormData,
  fallback = "Anfrage fehlgeschlagen.",
): Promise<ApiResult<T>> {
  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, message: "Nicht angemeldet." };

    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 202) {
      return { ok: false, message: parseApiDetail(data, fallback) };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: "Netzwerkfehler." };
  }
}
