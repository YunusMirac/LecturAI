import { createAdminClient } from "@/lib/server/api-helpers";
import {
  validateInvitationForRegister,
  validateRegisterBody,
  type RegisterBody,
} from "@/lib/server/register-validation";
import {
  GENERIC_SERVER_ERROR,
  internalErrorResponse,
  missingServiceRoleResponse,
} from "@/lib/server/http-errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { NextResponse } from "next/server";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "register", RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const validated = validateRegisterBody(body);
  if ("status" in validated) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const { inviteToken, email, password } = validated;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return missingServiceRoleResponse("register");
  }

  const { data: inv, error: invError } = await admin
    .from("invitations")
    .select("id, email, role, course_id, status, expires_at")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (invError) {
    return internalErrorResponse("register:invitation", invError);
  }

  const invCheck = validateInvitationForRegister(inv, email);
  if ("status" in invCheck) {
    return NextResponse.json(invCheck.body, { status: invCheck.status });
  }

  const { profileRole } = invCheck;

  const { data: authUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json(
        {
          email: [
            "Diese E-Mail ist bereits registriert. Bitte anmelden — neue Kurse erscheinen automatisch im Dashboard.",
          ],
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ detail: createError.message }, { status: 400 });
  }

  if (!authUser.user) {
    return NextResponse.json({ detail: GENERIC_SERVER_ERROR }, { status: 500 });
  }

  const userId = authUser.user.id;

  const { error: rpcError } = await admin.rpc("complete_invited_registration", {
    p_user_id: userId,
    p_email: email,
    p_role: profileRole,
    p_invitation_id: inv!.id,
  });

  if (rpcError) {
    await admin.auth.admin.deleteUser(userId);
    return internalErrorResponse("register:rpc", rpcError);
  }

  return NextResponse.json(
    {
      detail: "Registrierung erfolgreich. Du kannst dich jetzt anmelden.",
      email,
    },
    { status: 201 },
  );
}
