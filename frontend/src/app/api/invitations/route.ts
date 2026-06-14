import {
  createAdminClient,
  frontendRegisterUrl,
  generateInviteToken,
  getAuthenticatedProfile,
  sendInvitationEmail,
} from "@/lib/server/api-helpers";
import { NextResponse } from "next/server";

type InvitationBody = {
  email?: string;
  role?: "teacher" | "student";
  course_id?: string | null;
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const { profile } = auth;
  let body: InvitationBody;
  try {
    body = (await request.json()) as InvitationBody;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  const courseId = body.course_id ?? null;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ email: ["Gültige E-Mail erforderlich."] }, { status: 400 });
  }
  if (role !== "teacher" && role !== "student") {
    return NextResponse.json({ role: ["role muss teacher oder student sein."] }, { status: 400 });
  }

  if (role === "teacher") {
    if (profile.role !== "admin") {
      return NextResponse.json({ detail: "Nur Admins dürfen Lehrkräfte einladen." }, { status: 403 });
    }
    if (courseId) {
      return NextResponse.json(
        { course_id: ["Bei Lehrer-Einladungen darf kein Kurs angegeben werden."] },
        { status: 400 },
      );
    }
  }

  if (role === "student") {
    if (profile.role !== "teacher") {
      return NextResponse.json(
        { detail: "Nur Lehrkräfte dürfen Schüler:innen einladen." },
        { status: 403 },
      );
    }
    if (!courseId) {
      return NextResponse.json(
        { course_id: ["Für Schüler:innen-Einladungen ist course_id erforderlich."] },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: course } = await admin
      .from("courses")
      .select("id, teacher_id")
      .eq("id", courseId)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ detail: "Kurs nicht gefunden." }, { status: 400 });
    }
    if (course.teacher_id !== profile.id) {
      return NextResponse.json(
        { detail: "Du bist nicht die Lehrperson dieses Kurses." },
        { status: 403 },
      );
    }
  }

  const admin = createAdminClient();
  const inviteToken = generateInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error } = await admin
    .from("invitations")
    .insert({
      course_id: role === "student" ? courseId : null,
      invited_by: profile.id,
      email,
      role,
      invite_token: inviteToken,
      status: "pending",
      expires_at: expiresAt,
    })
    .select(
      "id, email, role, course_id, invite_token, status, expires_at, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }

  const registerUrl = frontendRegisterUrl(inviteToken);
  const emailSent = await sendInvitationEmail(email, registerUrl);

  return NextResponse.json(
    {
      ...invitation,
      email_sent: emailSent,
      register_url: registerUrl,
    },
    { status: 201 },
  );
}
