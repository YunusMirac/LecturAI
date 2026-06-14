import { createAdminClient, getAuthenticatedProfile } from "@/lib/server/api-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const { profile, user } = auth;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { detail: "SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local" },
      { status: 500 },
    );
  }

  if (profile.role === "admin") {
    const { data, error } = await admin
      .from("courses")
      .select("id, name, semester, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  if (profile.role === "teacher") {
    const { data, error } = await admin
      .from("courses")
      .select("id, name, semester, created_at, updated_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const { data: members, error: memberError } = await admin
    .from("course_members")
    .select("course_id")
    .eq("student_id", user.id);

  if (memberError) {
    return NextResponse.json({ detail: memberError.message }, { status: 500 });
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

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

type CreateBody = { name?: string; semester?: string | null };

export async function POST(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;

  const { profile, user } = auth;
  if (profile.role !== "teacher" && profile.role !== "admin") {
    return NextResponse.json(
      { detail: "Nur Lehrkräfte können Kurse anlegen." },
      { status: 403 },
    );
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ detail: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ name: ["Kursname ist erforderlich."] }, { status: 400 });
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

  const { data, error } = await admin
    .from("courses")
    .insert({
      teacher_id: user.id,
      name,
      semester: body.semester?.trim() || null,
    })
    .select("id, name, semester, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
