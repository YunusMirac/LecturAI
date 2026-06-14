import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type ProfileRole = "admin" | "teacher" | "student";

export type AuthProfile = {
  id: string;
  email: string;
  role: ProfileRole;
};

function missingServiceRoleResponse() {
  return NextResponse.json(
    {
      detail:
        "SUPABASE_SERVICE_ROLE_KEY fehlt in frontend/.env.local — siehe docs/SUPABASE_SETUP.md",
    },
    { status: 500 },
  );
}

async function resolveUser(request?: Request): Promise<User | null> {
  if (request) {
    const header = request.headers.get("authorization");
    if (header?.startsWith("Bearer ")) {
      try {
        const admin = createAdminClient();
        const { data } = await admin.auth.getUser(header.slice(7));
        return data.user;
      } catch {
        return null;
      }
    }
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export async function getAuthenticatedProfile(
  request?: Request,
): Promise<{ user: User; profile: AuthProfile } | { error: NextResponse }> {
  const user = await resolveUser(request);

  if (!user) {
    return {
      error: NextResponse.json({ detail: "Nicht angemeldet." }, { status: 401 }),
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: missingServiceRoleResponse() };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      error: NextResponse.json({ detail: profileError.message }, { status: 500 }),
    };
  }

  if (!profile) {
    return {
      error: NextResponse.json(
        {
          detail:
            "Kein Profil gefunden. Lege eine Zeile in public.profiles an (role = admin|teacher|student).",
        },
        { status: 403 },
      ),
    };
  }

  return {
    user,
    profile: profile as AuthProfile,
  };
}

export function generateInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export function frontendRegisterUrl(inviteToken: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/register?invite_token=${encodeURIComponent(inviteToken)}`;
}

export async function sendInvitationEmail(to: string, registerUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL ?? "LecturAI <onboarding@resend.dev>";

  if (!apiKey) {
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Einladung zu LecturAI",
        html: `
          <p>Du wurdest zu LecturAI eingeladen.</p>
          <p><a href="${registerUrl}">Hier registrieren</a></p>
          <p>Link (falls der Button nicht funktioniert):<br>${registerUrl}</p>
          <p>Der Link ist 7 Tage gültig.</p>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { createAdminClient };
