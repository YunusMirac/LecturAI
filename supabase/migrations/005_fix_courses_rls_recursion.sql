-- Fix: 500 "infinite recursion detected in policy for relation courses"
-- Im Supabase SQL Editor ausführen (nach 004).

CREATE OR REPLACE FUNCTION public.is_course_member(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_members
    WHERE course_id = p_course_id AND student_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_course_teacher(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = p_course_id AND teacher_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_course_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_course_teacher(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_course_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(UUID) TO authenticated;

DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "course_members_select" ON public.course_members;

CREATE POLICY "courses_select" ON public.courses
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR teacher_id = auth.uid()
    OR public.is_course_member(id)
  );

CREATE POLICY "course_members_select" ON public.course_members
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR student_id = auth.uid()
    OR public.is_course_teacher(course_id)
  );
