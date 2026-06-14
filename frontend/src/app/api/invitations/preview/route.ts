import { createAdminClient } from "@/lib/server/api-helpers";
import { buildInvitationPreview } from "@/lib/server/invitation-preview";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? searchParams.get("invite_token")?.trim();

  if (!token) {
    return NextResponse.json(
      { detail: "Einladungstoken fehlt." },
      { status: 400 },
    );
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

  const { data: inv, error } = await admin
    .from("invitations")
    .select("email, role, status, expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const result = buildInvitationPreview(inv);
  if (!result.ok) {
    return NextResponse.json(
      { detail: "Ungültige oder abgelaufene Einladung." },
      { status: result.status },
    );
  }

  return NextResponse.json(result.preview);
}
