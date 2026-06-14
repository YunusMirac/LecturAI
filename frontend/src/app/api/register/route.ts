import { createAdminClient } from "@/lib/server/api-helpers";
import {
  validateInvitationForRegister,
  validateRegisterBody,
  type RegisterBody,
} from "@/lib/server/register-validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
      { status: 500 },
    );
  }

  const { data: inv, error: invError } = await admin
    .from("invitations")
    .select("id, email, role, course_id, status, expires_at")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (invError) {
    return NextResponse.json({ detail: invError.message }, { status: 500 });
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
    return NextResponse.json({ detail: "Nutzer konnte nicht angelegt werden." }, { status: 500 });
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
    return NextResponse.json({ detail: rpcError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      detail: "Registrierung erfolgreich. Du kannst dich jetzt anmelden.",
      email,
    },
    { status: 201 },
  );
}
