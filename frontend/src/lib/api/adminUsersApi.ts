import { getAccessToken } from "@/lib/api/authApi";

export type AdminProfile = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type FetchAdminUsersResult =
  | { ok: true; users: AdminProfile[] }
  | { ok: false; reason: "unauthorized" | "forbidden" | "http" | "network"; message?: string };

export async function fetchAdminUsers(): Promise<FetchAdminUsersResult> {
  try {
    const token = await getAccessToken();
    if (!token) return { ok: false, reason: "unauthorized" };

    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      return {
        ok: false,
        reason: "http",
        message: typeof data.detail === "string" ? data.detail : undefined,
      };
    }

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return { ok: true, users: [] };

    const users: AdminProfile[] = data.map((row) => {
      const o = row as Record<string, unknown>;
      return {
        id: String(o.id),
        email: String(o.email),
        role: String(o.role),
        created_at: String(o.created_at),
        updated_at: String(o.updated_at),
      };
    });

    return { ok: true, users };
  } catch {
    return { ok: false, reason: "network" };
  }
}
