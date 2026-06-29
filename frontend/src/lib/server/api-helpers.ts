import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  internalErrorResponse,
  missingServiceRoleResponse,
} from "@/lib/server/http-errors";

import type { ProfileRole } from "@/lib/auth";
export type { ProfileRole };

export type AuthProfile = {
  id: string;
  email: string;
  role: ProfileRole;
};

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
    return { error: missingServiceRoleResponse("getAuthenticatedProfile") };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: internalErrorResponse("getAuthenticatedProfile", profileError) };
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

export function frontendDashboardUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/dashboard`;
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
  } catch (err) {
    console.error("[sendInvitationEmail] Resend request failed:", err);
    return false;
  }
}

export async function sendCourseAddedEmail(
  to: string,
  courseName: string,
  dashboardUrl: string,
): Promise<boolean> {
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
        subject: `Neuer Kurs in LecturAI: ${courseName}`,
        html: `
          <p>Du wurdest dem Kurs <strong>${courseName}</strong> hinzugefügt.</p>
          <p>Der Kurs ist ab sofort in deinem Dashboard sichtbar — melde dich einfach an:</p>
          <p><a href="${dashboardUrl}">Zum Dashboard</a></p>
          <p>Link (falls der Button nicht funktioniert):<br>${dashboardUrl}</p>
        `,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[sendCourseAddedEmail] Resend request failed:", err);
    return false;
  }
}

export { createAdminClient };
