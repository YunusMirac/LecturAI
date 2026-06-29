import {
  createAdminClient,
  frontendDashboardUrl,
  frontendRegisterUrl,
  generateInviteToken,
  getAuthenticatedProfile,
  sendCourseAddedEmail,
  sendInvitationEmail,
} from "@/lib/server/api-helpers";
import {
  validateInvitationRequest,
  type InvitationBody,
} from "@/lib/server/invitations-validation";
import {
  acceptPendingInvitationsForCourse,
  addStudentToCourse,
  canInviteEmailAsStudent,
  findProfileByEmail,
  isCourseMember,
} from "@/lib/server/student-course-enrollment";
import { NextResponse } from "next/server";
import { internalErrorResponse } from "@/lib/server/http-errors";

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

  const validated = validateInvitationRequest(body, profile.role);
  if ("status" in validated) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const { email, role, courseId } = validated;
  const admin = createAdminClient();

  if (role === "student") {
    const { data: course } = await admin
      .from("courses")
      .select("id, name, teacher_id")
      .eq("id", courseId!)
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

    const existingProfile = await findProfileByEmail(admin, email);
    if (existingProfile) {
      if (!canInviteEmailAsStudent(existingProfile)) {
        return NextResponse.json(
          {
            detail:
              "Diese E-Mail ist bereits registriert, aber nicht als Schüler:in. Registrierung über Einladungslink nicht möglich.",
          },
          { status: 409 },
        );
      }

      const alreadyMember = await isCourseMember(admin, courseId!, existingProfile.id);
      if (alreadyMember) {
        return NextResponse.json(
          {
            detail: "Diese Schüler:in ist bereits in diesem Kurs.",
            added_directly: true,
            already_member: true,
          },
          { status: 409 },
        );
      }

      await addStudentToCourse(admin, courseId!, existingProfile.id);
      await acceptPendingInvitationsForCourse(admin, courseId!, email);

      const dashboardUrl = frontendDashboardUrl();
      const emailSent = await sendCourseAddedEmail(
        email,
        String((course as { name: string }).name),
        dashboardUrl,
      );

      return NextResponse.json(
        {
          email,
          course_id: courseId,
          added_directly: true,
          already_member: false,
          email_sent: emailSent,
          detail: emailSent
            ? "Schüler:in ist bereits registriert und wurde dem Kurs hinzugefügt. Benachrichtigung per E-Mail gesendet."
            : "Schüler:in ist bereits registriert und sieht den Kurs ab sofort im Dashboard.",
        },
        { status: 201 },
      );
    }
  }

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
    return internalErrorResponse("invitations", error);
  }

  const registerUrl = frontendRegisterUrl(inviteToken);
  const emailSent = await sendInvitationEmail(email, registerUrl);

  return NextResponse.json(
    {
      ...invitation,
      added_directly: false,
      email_sent: emailSent,
      register_url: registerUrl,
    },
    { status: 201 },
  );
}
