import { buildPasswordResetRedirectUrl } from "@/lib/api/authApi";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSiteOrigin } from "@/lib/supabase/env";
import {
  validateForgotPasswordEmail,
} from "@/lib/server/password-validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
      { status: 500 },
    );
  }

  const redirectTo = buildPasswordResetRedirectUrl(resolveSiteOrigin(request));
  const { error } = await admin.auth.resetPasswordForEmail(validated.email, { redirectTo });

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    detail:
      "Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze eine E-Mail mit einem Link zum Zurücksetzen.",
  });
}
