import { API_URL } from "./config";
import { isRecord } from "./guards";

export type AdminProfile = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  has_login_account: boolean;
};

export type FetchAdminUsersSuccess = { ok: true; users: AdminProfile[] };
export type FetchAdminUsersFailure = {
  ok: false;
  reason: "unauthorized" | "forbidden" | "http" | "network";
};

export type FetchAdminUsersResult = FetchAdminUsersSuccess | FetchAdminUsersFailure;

export async function fetchAdminUsers(accessToken: string): Promise<FetchAdminUsersResult> {
  try {
    const res = await fetch(`${API_URL}/api/admin/users/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 403) return { ok: false, reason: "forbidden" };
    if (!res.ok) return { ok: false, reason: "http" };
    const data: unknown = await res.json().catch(() => null);
    if (!Array.isArray(data)) return { ok: true, users: [] };
    const users = data.map(parseAdminProfile).filter((u): u is AdminProfile => u !== null);
    return { ok: true, users };
  } catch {
    return { ok: false, reason: "network" };
  }
}

function parseAdminProfile(row: unknown): AdminProfile | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const email = row.email;
  const role = row.role;
  const created_at = row.created_at;
  const updated_at = row.updated_at;
  const has_login_account = row.has_login_account;
  if (typeof id !== "string" || typeof email !== "string" || typeof role !== "string") {
    return null;
  }
  if (typeof created_at !== "string" || typeof updated_at !== "string") return null;
  if (typeof has_login_account !== "boolean") return null;
  return { id, email, role, created_at, updated_at, has_login_account };
}
