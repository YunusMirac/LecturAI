import { createAdminClient, getAuthenticatedProfile } from "@/lib/server/api-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  if (auth.profile.role !== "admin") {
    return NextResponse.json({ detail: "Nur Admins haben Zugriff." }, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
      { status: 500 },
    );
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id, email, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
