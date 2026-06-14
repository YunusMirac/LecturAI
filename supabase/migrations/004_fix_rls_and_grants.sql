-- Fix: 403 auf profiles, 500 auf courses
-- Ursachen: fehlende GRANTs + RLS-Rekursion durch is_admin()/is_teacher()
-- Im Supabase SQL Editor ausführen.

-- ── 1. Hilfsfunktion (SECURITY DEFINER = liest profiles ohne RLS-Rekursion) ──
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;

-- Alte Funktionen ersetzen (Kompatibilität)
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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;

-- ── 2. Policies neu (ohne Rekursion auf profiles) ────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "courses_insert_teacher" ON public.courses;
DROP POLICY IF EXISTS "courses_update_teacher" ON public.courses;
DROP POLICY IF EXISTS "course_members_select" ON public.course_members;
DROP POLICY IF EXISTS "invitations_select" ON public.invitations;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.auth_role() = 'admin');

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

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

-- ── 3. GRANTs (403 wenn authenticated kein SELECT hat) ───────────────────────
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.courses TO authenticated;
GRANT SELECT ON public.course_members TO authenticated;
GRANT SELECT ON public.invitations TO authenticated;

-- Service role (API-Routes) braucht volle Rechte
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.courses TO service_role;
GRANT ALL ON public.course_members TO service_role;
GRANT ALL ON public.invitations TO service_role;
