-- Klausur-Pool: Schwierigkeit pro Frage, Exam-Config, individuelle Schüler-Snapshots
-- Nach 010_exam_quiz.sql ausführen.

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS exam_config_json JSONB;

CREATE TABLE IF NOT EXISTS public.quiz_exam_attempt_questions (
  attempt_id UUID NOT NULL REFERENCES public.quiz_exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  sort_order INT NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  UNIQUE (attempt_id, sort_order)
);

CREATE INDEX IF NOT EXISTS quiz_exam_attempt_questions_attempt_id_idx
  ON public.quiz_exam_attempt_questions(attempt_id);

ALTER TABLE public.quiz_exam_attempt_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_exam_attempt_questions_select" ON public.quiz_exam_attempt_questions
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.quiz_exam_attempts a
      WHERE a.id = quiz_exam_attempt_questions.attempt_id
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

CREATE POLICY "quiz_exam_attempt_questions_insert_self" ON public.quiz_exam_attempt_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_exam_attempts a
      WHERE a.id = quiz_exam_attempt_questions.attempt_id AND a.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.quiz_exam_attempt_questions TO authenticated;
GRANT ALL ON public.quiz_exam_attempt_questions TO service_role;
