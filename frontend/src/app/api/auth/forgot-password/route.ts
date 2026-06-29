import { buildPasswordResetRedirectUrl } from "@/lib/api/authApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSiteOrigin } from "@/lib/supabase/env";
import {
  internalErrorResponse,
  missingServiceRoleResponse,
} from "@/lib/server/http-errors";
import {
  validateForgotPasswordEmail,
} from "@/lib/server/password-validation";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { NextResponse } from "next/server";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "forgot-password", RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const validated = validateForgotPasswordEmail(body.email ?? "");
  if ("status" in validated) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return missingServiceRoleResponse("forgot-password");
  }

  const redirectTo = buildPasswordResetRedirectUrl(resolveSiteOrigin(request));
  const { error } = await admin.auth.resetPasswordForEmail(validated.email, { redirectTo });

  if (error) {
    return internalErrorResponse("forgot-password", error);
  }

  return NextResponse.json({
    detail:
      "Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze eine E-Mail mit einem Link zum Zurücksetzen.",
  });
}
