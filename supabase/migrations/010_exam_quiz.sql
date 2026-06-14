-- Klausur-Modus + Quiz-Typ (live | exam)
-- Nach 009_live_quiz.sql ausführen.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS quiz_type TEXT NOT NULL DEFAULT 'live'
    CHECK (quiz_type IN ('live', 'exam')),
  ADD COLUMN IF NOT EXISTS exam_open BOOLEAN NOT NULL DEFAULT false;

UPDATE public.quizzes SET quiz_type = 'live' WHERE quiz_type IS NULL;

-- ── Klausur-Versuche (1 pro Schüler:in pro Quiz) ─────────────────────────────
CREATE TABLE public.quiz_exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_email TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  submit_reason TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (submit_reason IN ('in_progress', 'manual', 'timeout')),
  correct_count INT,
  total_count INT,
  percent_correct NUMERIC(5, 2),
  UNIQUE (quiz_id, user_id)
);

CREATE INDEX quiz_exam_attempts_quiz_id_idx ON public.quiz_exam_attempts(quiz_id);

-- ── Antworten (is_correct nur für Lehrkraft sichtbar) ────────────────────────
CREATE TABLE public.quiz_exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  choice_id UUID REFERENCES public.quiz_choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX quiz_exam_answers_attempt_id_idx ON public.quiz_exam_answers(attempt_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_exam_attempts_select" ON public.quiz_exam_attempts
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_exam_attempts.quiz_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "quiz_exam_attempts_insert_self" ON public.quiz_exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "quiz_exam_attempts_update_self" ON public.quiz_exam_attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "quiz_exam_answers_select" ON public.quiz_exam_answers
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.quiz_exam_attempts a
      WHERE a.id = quiz_exam_answers.attempt_id
        AND (
          a.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.quizzes q
            JOIN public.courses c ON c.id = q.course_id
            WHERE q.id = a.quiz_id AND c.teacher_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "quiz_exam_answers_insert_self" ON public.quiz_exam_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_exam_attempts a
      WHERE a.id = quiz_exam_answers.attempt_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "quiz_exam_answers_update_self" ON public.quiz_exam_answers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_exam_attempts a
      WHERE a.id = quiz_exam_answers.attempt_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_exam_attempts a
      WHERE a.id = quiz_exam_answers.attempt_id AND a.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.quiz_exam_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quiz_exam_answers TO authenticated;
GRANT ALL ON public.quiz_exam_attempts TO service_role;
GRANT ALL ON public.quiz_exam_answers TO service_role;
