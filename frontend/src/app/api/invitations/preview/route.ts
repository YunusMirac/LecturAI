import { createAdminClient } from "@/lib/server/api-helpers";
import { buildInvitationPreview } from "@/lib/server/invitation-preview";
import {
  internalErrorResponse,
  missingServiceRoleResponse,
} from "@/lib/server/http-errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { NextResponse } from "next/server";

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "invitation-preview", RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

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
    return missingServiceRoleResponse("invitation-preview");
  }

  const { data: inv, error } = await admin
    .from("invitations")
    .select("email, role, status, expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) {
    return internalErrorResponse("invitation-preview", error);
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
