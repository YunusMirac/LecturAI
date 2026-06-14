-- Live-Quiz (Kahoot-Modus): Zugangscode, Lobby, synchrones Spiel, Rangliste
-- Nach 008_quizzes.sql ausführen.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS access_code TEXT,
  ADD COLUMN IF NOT EXISTS live_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (live_status IN ('idle', 'lobby', 'question', 'reveal', 'finished', 'closed')),
  ADD COLUMN IF NOT EXISTS current_question_index INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reveal_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seconds_per_question INT NOT NULL DEFAULT 30;

CREATE UNIQUE INDEX IF NOT EXISTS quizzes_access_code_unique_idx
  ON public.quizzes (access_code)
  WHERE access_code IS NOT NULL;

-- ── Teilnehmer (Warteliste + Rangliste) ─────────────────────────────────────
CREATE TABLE public.quiz_live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_email TEXT NOT NULL,
  total_score INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, user_id)
);

CREATE INDEX quiz_live_participants_quiz_id_idx ON public.quiz_live_participants(quiz_id);

-- ── Antworten pro Frage ──────────────────────────────────────────────────────
CREATE TABLE public.quiz_live_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  choice_id UUID NOT NULL REFERENCES public.quiz_choices(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  points INT NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, question_id, user_id)
);

CREATE INDEX quiz_live_answers_quiz_question_idx
  ON public.quiz_live_answers(quiz_id, question_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_live_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_live_participants_select" ON public.quiz_live_participants
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_live_participants.quiz_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "quiz_live_participants_insert_self" ON public.quiz_live_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "quiz_live_answers_select" ON public.quiz_live_answers
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_live_answers.quiz_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "quiz_live_answers_insert_self" ON public.quiz_live_answers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON public.quiz_live_participants TO authenticated;
GRANT SELECT, INSERT ON public.quiz_live_answers TO authenticated;
GRANT ALL ON public.quiz_live_participants TO service_role;
GRANT ALL ON public.quiz_live_answers TO service_role;
