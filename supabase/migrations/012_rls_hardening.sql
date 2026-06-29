-- RLS-Härtung: is_correct nur für Lehrkräfte, Live/Exam-Teilnahme an Kurs + Quiz-Status gebunden
-- Nach 011_exam_pool.sql ausführen.

-- ── Hilfsfunktion: Kursmitgliedschaft (Schüler:in) ───────────────────────────
CREATE OR REPLACE FUNCTION public.is_course_student_member(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_members cm
    WHERE cm.course_id = p_course_id
      AND cm.student_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_course_student_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_course_student_member(UUID) TO authenticated;

-- ── quiz_choices: is_correct nur für Lehrkraft/Admin direkt lesbar ───────────
DROP POLICY IF EXISTS "quiz_choices_select" ON public.quiz_choices;

CREATE POLICY "quiz_choices_select_teacher" ON public.quiz_choices
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      JOIN public.courses c ON c.id = q.course_id
      WHERE qq.id = quiz_choices.question_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Schüler:innen sehen Antwortoptionen ohne is_correct
CREATE OR REPLACE VIEW public.quiz_choices_student
WITH (security_invoker = false) AS
SELECT qc.id, qc.question_id, qc.text, qc.sort_order
FROM public.quiz_choices qc
JOIN public.quiz_questions qq ON qq.id = qc.question_id
JOIN public.quizzes q ON q.id = qq.quiz_id
WHERE q.status = 'published'
  AND public.is_course_student_member(q.course_id);

GRANT SELECT ON public.quiz_choices_student TO authenticated;

-- ── Live-Quiz: Teilnahme nur als Kursmitglied bei geöffnetem Live-Quiz ───────
DROP POLICY IF EXISTS "quiz_live_participants_insert_self" ON public.quiz_live_participants;

CREATE POLICY "quiz_live_participants_insert_member" ON public.quiz_live_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = quiz_live_participants.quiz_id
        AND q.quiz_type = 'live'
        AND q.status = 'published'
        AND q.live_open = true
        AND public.is_course_student_member(q.course_id)
    )
  );

DROP POLICY IF EXISTS "quiz_live_answers_insert_self" ON public.quiz_live_answers;

CREATE POLICY "quiz_live_answers_insert_participant" ON public.quiz_live_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.quiz_live_participants p
      WHERE p.quiz_id = quiz_live_answers.quiz_id
        AND p.user_id = auth.uid()
    )
  );

-- ── Klausur: Versuch nur als Kursmitglied bei geöffneter Klausur ─────────────
DROP POLICY IF EXISTS "quiz_exam_attempts_insert_self" ON public.quiz_exam_attempts;

CREATE POLICY "quiz_exam_attempts_insert_member" ON public.quiz_exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.quizzes q
      WHERE q.id = quiz_exam_attempts.quiz_id
        AND q.quiz_type = 'exam'
        AND q.status = 'published'
        AND q.exam_open = true
        AND public.is_course_student_member(q.course_id)
    )
  );
