import { createAdminClient, getAuthenticatedProfile } from "@/lib/server/api-helpers";
import {
  buildRemoveMemberResult,
  removeMemberDetailMessage,
  validateRemoveMemberBody,
} from "@/lib/server/course-access";
import {
  canViewCourseMembers,
  isValidCourseId,
  mergeMembersAndInvitations,
  parseRegisteredMember,
  type CourseMemberEntry,
} from "@/lib/server/course-members";
import { requireManagedCourse } from "@/lib/server/require-managed-course";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { courseId } = await context.params;

  if (!isValidCourseId(courseId)) {
    return NextResponse.json({ detail: "Ungültige Kurs-ID." }, { status: 400 });
  }

  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const { profile } = auth;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
      { status: 500 },
    );
  }

  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, teacher_id, name")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    return NextResponse.json({ detail: courseError.message }, { status: 500 });
  }
  if (!course) {
    return NextResponse.json({ detail: "Kurs nicht gefunden." }, { status: 404 });
  }

  if (!canViewCourseMembers(profile.role, profile.id, course.teacher_id as string)) {
    return NextResponse.json(
      { detail: "Keine Berechtigung für diese Kursmitgliederliste." },
      { status: 403 },
    );
  }

  const { data: memberRows, error: membersError } = await admin
    .from("course_members")
    .select("student_id, joined_at, profiles:student_id(email)")
    .eq("course_id", courseId)
    .order("joined_at", { ascending: false });

  if (membersError) {
    return NextResponse.json({ detail: membersError.message }, { status: 500 });
  }

  const registered = (memberRows ?? [])
    .map(parseRegisteredMember)
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const { data: inviteRows, error: invitesError } = await admin
    .from("invitations")
    .select("email, created_at")
    .eq("course_id", courseId)
    .eq("role", "student")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (invitesError) {
    return NextResponse.json({ detail: invitesError.message }, { status: 500 });
  }

  const members: CourseMemberEntry[] = mergeMembersAndInvitations(
    registered,
    (inviteRows ?? []).map((row) => ({
      email: String((row as { email: string }).email),
      created_at: String((row as { created_at: string }).created_at),
    })),
  );

  return NextResponse.json({
    course_id: course.id,
    course_name: course.name,
    members,
    counts: {
      registered: members.filter((m) => m.status === "registered").length,
      pending: members.filter((m) => m.status === "pending").length,
      total: members.length,
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { courseId } = await context.params;
  const managed = await requireManagedCourse(request, courseId);
  if ("error" in managed) return managed.error;

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const validated = validateRemoveMemberBody(body);
  if ("status" in validated) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const admin = createAdminClient();
  const { email } = validated;

  const { data: profileRow } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let membershipDeleted = false;
  if (profileRow?.id) {
    const { data: deletedRows, error: deleteError } = await admin
      .from("course_members")
      .delete()
      .eq("course_id", courseId)
      .eq("student_id", profileRow.id as string)
      .select("student_id");

    if (deleteError) {
      return NextResponse.json({ detail: deleteError.message }, { status: 500 });
    }
    membershipDeleted = (deletedRows ?? []).length > 0;
  }

  const { data: revokedRows, error: inviteError } = await admin
    .from("invitations")
    .update({ status: "declined" })
    .eq("course_id", courseId)
    .eq("email", email)
    .eq("status", "pending")
    .select("id");

  if (inviteError) {
    return NextResponse.json({ detail: inviteError.message }, { status: 500 });
  }

  const invitationRevoked = (revokedRows ?? []).length > 0;
  const result = buildRemoveMemberResult(membershipDeleted, invitationRevoked);

  if (!result) {
    return NextResponse.json(
      { detail: "Keine registrierte Teilnahme oder offene Einladung gefunden." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...result,
    detail: removeMemberDetailMessage(result),
  });
}
