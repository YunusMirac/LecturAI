import { createAdminClient, getAuthenticatedProfile } from "@/lib/server/api-helpers";
import {
  canCreateCourse,
  validateCreateCourseBody,
} from "@/lib/server/invitations-validation";
import { NextResponse } from "next/server";
import { internalErrorResponse, missingServiceRoleResponse } from "@/lib/server/http-errors";

export async function GET(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const { profile, user } = auth;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return missingServiceRoleResponse("courses");
  }

  if (profile.role === "admin") {
    const { data, error } = await admin
      .from("courses")
      .select("id, name, semester, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) return internalErrorResponse("courses", error);
    return NextResponse.json(data ?? []);
  }

  if (profile.role === "teacher") {
    const { data, error } = await admin
      .from("courses")
      .select("id, name, semester, created_at, updated_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return internalErrorResponse("courses", error);
    return NextResponse.json(data ?? []);
  }

  const { data: members, error: memberError } = await admin
    .from("course_members")
    .select("course_id")
    .eq("student_id", user.id);

  if (memberError) {
    return internalErrorResponse("courses", memberError);
  }

  const ids = (members ?? []).map((m) => m.course_id as string);
  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await admin
    .from("courses")
    .select("id, name, semester, created_at, updated_at")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (error) return internalErrorResponse("courses", error);
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const { profile, user } = auth;
  if (!canCreateCourse(profile.role)) {
    return NextResponse.json(
      { detail: "Nur Lehrkräfte können Kurse anlegen." },
      { status: 403 },
    );
  }

  let body: { name?: string; semester?: string | null };
  try {
    body = (await request.json()) as { name?: string; semester?: string | null };
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const validated = validateCreateCourseBody(body);
  if ("status" in validated) {
    return NextResponse.json(validated.body, { status: validated.status });
  }

  const { name, semester } = validated;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return missingServiceRoleResponse("courses");
  }

  const { data, error } = await admin
    .from("courses")
    .insert({
      teacher_id: user.id,
      name,
      semester,
    })
    .select("id, name, semester, created_at, updated_at")
    .single();

  if (error) return internalErrorResponse("courses", error);
  return NextResponse.json(data, { status: 201 });
}
