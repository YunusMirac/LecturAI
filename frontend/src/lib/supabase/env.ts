export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local.");
  }
  return url;
}

/** Supabase publishable (sb_publishable_…) bevorzugen — JWT-anon ist in neuen Projekten oft ungültig. */
export function getSupabasePublicKey(): string {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = publishable || anon;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt in .env.local.",
    );
  }
  return key;
}

export function resolveSiteOrigin(request?: Request): string {
  const fromHeader = request?.headers.get("origin")?.trim();
  if (fromHeader) return fromHeader.replace(/\/$/, "");

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return "http://localhost:3000";
}
