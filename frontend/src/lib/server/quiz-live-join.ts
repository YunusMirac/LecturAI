import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { internalErrorResponse } from "@/lib/server/http-errors";

import { isValidAccessCodeFormat, normalizeAccessCode } from "@/lib/server/quiz-access-code";
import type { AuthProfile } from "@/lib/server/api-helpers";

export type LiveQuizJoinRow = {
  id: string;
  title: string;
  course_id: string;
  status: string;
  access_code: string | null;
  live_open: boolean;
  live_status: string;
  quiz_type?: string;
  exam_open?: boolean;
};

export function joinAccessCodeError(code: string): NextResponse | null {
  if (isValidAccessCodeFormat(code)) return null;
  return NextResponse.json(
    { access_code: ["Bitte einen gültigen Zugangscode eingeben (4–8 Zeichen)."] },
    { status: 400 },
  );
}

export function assertPublishedQuiz(quiz: { status: string }): NextResponse | null {
  if (quiz.status === "published") return null;
  return NextResponse.json({ detail: "Dieses Quiz ist nicht veröffentlicht." }, { status: 403 });
}

export function assertLiveOpenForStudent(
  quiz: { live_open: boolean },
  canManage: boolean,
): NextResponse | null {
  if (canManage || quiz.live_open) return null;
  return NextResponse.json(
    { detail: "Der Lehrer hat dieses Quiz gerade nicht geöffnet." },
    { status: 403 },
  );
}

export function assertExamOpenForStudent(
  quiz: { exam_open?: boolean },
  canManage: boolean,
): NextResponse | null {
  if (canManage || quiz.exam_open) return null;
  return NextResponse.json(
    { detail: "Der Lehrer hat diese Klausur gerade nicht geöffnet." },
    { status: 403 },
  );
}

export function assertJoinableExamQuiz(quiz: { exam_open?: boolean }): NextResponse | null {
  if (quiz.exam_open) return null;
  return NextResponse.json(
    { detail: "Der Lehrer hat diese Klausur noch nicht für Schüler geöffnet." },
    { status: 403 },
  );
}

export function assertJoinableLiveQuiz(quiz: LiveQuizJoinRow): NextResponse | null {
  if (!quiz.live_open) {
    return NextResponse.json(
      { detail: "Der Lehrer hat dieses Quiz noch nicht für Schüler geöffnet." },
      { status: 403 },
    );
  }
  return null;
}

export function assertMatchingAccessCode(
  quiz: LiveQuizJoinRow,
  code: string,
): NextResponse | null {
  if (quiz.access_code && normalizeAccessCode(quiz.access_code) === normalizeAccessCode(code))
    return null;
  return NextResponse.json(
    { detail: "Zugangscode ist für dieses Quiz nicht korrekt." },
    { status: 403 },
  );
}

export function assertJoinableLiveStatus(quiz: LiveQuizJoinRow): NextResponse | null {
  if (quiz.live_status === "closed" || quiz.live_status === "finished") {
    return NextResponse.json({ detail: "Diese Quiz-Runde ist bereits beendet." }, { status: 409 });
  }
  if (quiz.live_status === "lobby" || quiz.live_status === "idle") return null;
  return NextResponse.json(
    { detail: "Das Quiz läuft bereits — du kannst nicht mehr beitreten." },
    { status: 409 },
  );
}

export async function upsertLiveParticipant(
  admin: SupabaseClient,
  quizId: string,
  profile: AuthProfile,
): Promise<NextResponse | null> {
  const { data: existing } = await admin
    .from("quiz_live_participants")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) return null;

  const { error } = await admin.from("quiz_live_participants").insert({
    quiz_id: quizId,
    user_id: profile.id,
    display_email: profile.email,
  });
  if (error) return internalErrorResponse("upsertLiveParticipant", error);
  return null;
}

export async function hasLiveParticipant(
  admin: SupabaseClient,
  quizId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("quiz_live_participants")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}
