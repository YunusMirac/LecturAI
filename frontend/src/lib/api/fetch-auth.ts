import { getAccessToken } from "@/lib/api/authApi";

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
