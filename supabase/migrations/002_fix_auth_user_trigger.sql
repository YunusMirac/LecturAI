-- Fix: "Database error creating new user" + profiles_role_check
-- Ursache: alter Trigger auf auth.users legt Profile mit role = E-Mail-Prefix an (z.B. "yunus")
-- LecturAI: Profile nur manuell oder über /api/register — kein Auto-Trigger.
--
-- Im Supabase Dashboard: SQL Editor → einfügen → Run

-- ── 1. ALLE Trigger auf auth.users entfernen ─────────────────────────────────
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
  END LOOP;
END $$;

-- ── 2. Legacy-Funktionen entfernen ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;

-- ── 3. Kaputte Profil-Zeilen (ungültige role) löschen ────────────────────────
DELETE FROM public.profiles
WHERE role NOT IN ('admin', 'teacher', 'student');
