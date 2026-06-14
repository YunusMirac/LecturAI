import { createAdminClient } from "@/lib/server/api-helpers";
import { NextResponse } from "next/server";

type RegisterBody = {
  invite_token?: string;
  email?: string;
  password?: string;
  password_confirm?: string;
};

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const inviteToken = body.invite_token?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const passwordConfirm = body.password_confirm ?? "";

  if (!inviteToken) {
    return NextResponse.json(
      { invite_token: ["Einladungstoken ist erforderlich."] },
      { status: 400 },
    );
  }
  if (!email) {
    return NextResponse.json({ email: ["E-Mail ist erforderlich."] }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { password: ["Passwort muss mindestens 8 Zeichen haben."] },
      { status: 400 },
    );
  }
  if (password !== passwordConfirm) {
    return NextResponse.json(
      { password_confirm: ["Passwörter stimmen nicht überein."] },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: inv, error: invError } = await admin
    .from("invitations")
    .select("id, email, role, course_id, status, expires_at")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (invError || !inv) {
    return NextResponse.json(
      { invite_token: ["Ungültiges oder bereits verwendetes Einladungstoken."] },
      { status: 400 },
    );
  }
  if (inv.status !== "pending") {
    return NextResponse.json(
      { invite_token: ["Ungültiges oder bereits verwendetes Einladungstoken."] },
      { status: 400 },
    );
  }
  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json(
      { invite_token: ["Die Einladung ist abgelaufen."] },
      { status: 400 },
    );
  }
  if (inv.email.trim().toLowerCase() !== email) {
    return NextResponse.json(
      { email: ["E-Mail muss exakt der eingeladenen Adresse entsprechen."] },
      { status: 400 },
    );
  }

  const profileRole = inv.role === "student" ? "student" : "teacher";

  const { data: authUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json(
        { email: ["Diese E-Mail ist bereits registriert."] },
        { status: 400 },
      );
    }
    return NextResponse.json({ detail: createError.message }, { status: 400 });
  }

  if (!authUser.user) {
    return NextResponse.json({ detail: "Nutzer konnte nicht angelegt werden." }, { status: 500 });
  }

  const userId = authUser.user.id;
  const now = new Date().toISOString();

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    email,
    role: profileRole,
    created_at: now,
    updated_at: now,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ detail: profileError.message }, { status: 500 });
  }

  const { error: invUpdateError } = await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: now })
    .eq("id", inv.id)
    .eq("status", "pending");

  if (invUpdateError) {
    return NextResponse.json({ detail: invUpdateError.message }, { status: 500 });
  }

  if (inv.role === "student" && inv.course_id) {
    const { error: memberError } = await admin.from("course_members").insert({
      course_id: inv.course_id,
      student_id: userId,
      joined_at: now,
    });
    if (memberError) {
      return NextResponse.json({ detail: memberError.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      detail: "Registrierung erfolgreich. Du kannst dich jetzt anmelden.",
    },
    { status: 201 },
  );
}
