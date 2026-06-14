-- Fix: profiles_role_check — alter Trigger setzt role z.B. auf "yunus" (E-Mail-Prefix)
-- Im Supabase SQL Editor ausführen (alles auf einmal).

-- ── 1. ALLE Trigger auf auth.users entfernen (nicht nur bekannte Namen) ───────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
    RAISE NOTICE 'Dropped trigger: %', r.tgname;
  END LOOP;
END $$;

-- ── 2. Bekannte Legacy-Funktionen entfernen ──────────────────────────────────
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- ── 3. Kaputte Profil-Zeilen ohne gültige Rolle löschen ─────────────────────
DELETE FROM public.profiles
WHERE role NOT IN ('admin', 'teacher', 'student');

-- ── 4. Admin-Profil korrekt anlegen (E-Mail anpassen!) ───────────────────────
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'yunus@yunus.yunus'
ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      email = EXCLUDED.email,
      updated_at = now();

-- ── 5. Prüfen ────────────────────────────────────────────────────────────────
-- SELECT id, email, role FROM public.profiles;
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
