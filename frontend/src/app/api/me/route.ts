import { getAuthenticatedProfile } from "@/lib/server/api-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedProfile(request);
  if ("error" in auth) return auth.error;
  return NextResponse.json(auth.profile);
}
