-- LecturAI: Supabase-only Schema (ohne Django)
-- Im Supabase Dashboard: SQL Editor → New query → einfügen → Run
-- ACHTUNG: Löscht alte Django-Tabellen falls vorhanden. Backup vorher!

-- ── Legacy-Trigger entfernen (verhindert "Database error creating new user") ─
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;

-- ── Alte Django-/Legacy-Tabellen entfernen ───────────────────────────────────
DROP TABLE IF EXISTS public.answers CASCADE;
DROP TABLE IF EXISTS public.session_participants CASCADE;
DROP TABLE IF EXISTS public.quiz_sessions CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.course_members CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.auth_user_user_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_user_groups CASCADE;
DROP TABLE IF EXISTS public.auth_user CASCADE;
DROP TABLE IF EXISTS public.auth_group_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_permission CASCADE;
DROP TABLE IF EXISTS public.auth_group CASCADE;
DROP TABLE IF EXISTS public.django_content_type CASCADE;

-- ── Profile (1:1 mit auth.users) ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Kurse ────────────────────────────────────────────────────────────────────
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  semester TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.course_members (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, student_id)
);

-- ── Einladungen (Whitelist-Registrierung) ────────────────────────────────────
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  invite_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX invitations_token_idx ON public.invitations(invite_token);
CREATE INDEX invitations_email_idx ON public.invitations(email);

-- ── Hilfsfunktionen für RLS (SECURITY DEFINER = keine Rekursion) ─────────────
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.auth_role() IN ('teacher', 'admin');
$$;

REVOKE ALL ON FUNCTION public.auth_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- profiles: eigenes Profil lesen; Admin liest alle
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.auth_role() = 'admin');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- courses: Admin alle; Lehrkraft eigene; Schüler Mitgliedschaften
CREATE POLICY "courses_select" ON public.courses
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.course_members cm
      WHERE cm.course_id = courses.id AND cm.student_id = auth.uid()
    )
  );

CREATE POLICY "courses_insert_teacher" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_role() IN ('teacher', 'admin')
    AND teacher_id = auth.uid()
  );

CREATE POLICY "courses_update_teacher" ON public.courses
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- course_members: lesen wer Kurs sehen darf
CREATE POLICY "course_members_select" ON public.course_members
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_members.course_id AND c.teacher_id = auth.uid()
    )
  );

-- invitations: eingeladene Person sieht eigene pending; Admin/Lehrkraft eigene gesendete
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR invited_by = auth.uid()
    OR (
      status = 'pending'
      AND email = (SELECT email FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ── GRANTs für authenticated (403 ohne diese Rechte) ─────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.courses TO authenticated;
GRANT SELECT ON public.course_members TO authenticated;
GRANT SELECT ON public.invitations TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.courses TO service_role;
GRANT ALL ON public.course_members TO service_role;
GRANT ALL ON public.invitations TO service_role;

-- ── updated_at Trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
