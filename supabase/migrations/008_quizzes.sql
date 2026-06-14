-- Quiz-Feature: PDF → KI → Multiple-Choice (Phase 2 Lehrer-Flow)
-- Im Supabase SQL Editor nach 001–007 ausführen.

-- ── Tabellen ─────────────────────────────────────────────────────────────────
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'draft', 'published', 'failed')),
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_pdf_path TEXT,
  generation_error TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quizzes_course_id_idx ON public.quizzes(course_id);
CREATE INDEX quizzes_status_idx ON public.quizzes(status);

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quiz_questions_quiz_id_idx ON public.quiz_questions(quiz_id);

CREATE TABLE public.quiz_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX quiz_choices_question_id_idx ON public.quiz_choices(question_id);

-- ── updated_at ───────────────────────────────────────────────────────────────
CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_choices ENABLE ROW LEVEL SECURITY;

-- quizzes: Lehrkraft/Admin voller Zugriff; Schüler nur published (Phase 3)
CREATE POLICY "quizzes_select" ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()
    )
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.course_members cm
        WHERE cm.course_id = quizzes.course_id AND cm.student_id = auth.uid()
      )
    )
  );

CREATE POLICY "quizzes_insert_teacher" ON public.quizzes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_role() IN ('teacher', 'admin')
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (c.teacher_id = auth.uid() OR public.auth_role() = 'admin')
    )
  );

CREATE POLICY "quizzes_update_teacher" ON public.quizzes
  FOR UPDATE TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "quizzes_delete_teacher" ON public.quizzes
  FOR DELETE TO authenticated
  USING (
    public.auth_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()
    )
  );

-- questions: über quiz-Zugriff
CREATE POLICY "quiz_questions_select" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_questions.quiz_id
        AND (
          public.auth_role() = 'admin'
          OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = q.course_id AND c.teacher_id = auth.uid()
          )
          OR (
            q.status = 'published'
            AND EXISTS (
              SELECT 1 FROM public.course_members cm
              WHERE cm.course_id = q.course_id AND cm.student_id = auth.uid()
            )
          )
        )
    )
  );

CREATE POLICY "quiz_questions_mutate_teacher" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id
        AND (public.auth_role() = 'admin' OR c.teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.id = quiz_questions.quiz_id
        AND (public.auth_role() = 'admin' OR c.teacher_id = auth.uid())
    )
  );

CREATE POLICY "quiz_choices_select" ON public.quiz_choices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_choices.question_id
        AND (
          public.auth_role() = 'admin'
          OR EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = q.course_id AND c.teacher_id = auth.uid()
          )
          OR (
            q.status = 'published'
            AND EXISTS (
              SELECT 1 FROM public.course_members cm
              WHERE cm.course_id = q.course_id AND cm.student_id = auth.uid()
            )
          )
        )
    )
  );

CREATE POLICY "quiz_choices_mutate_teacher" ON public.quiz_choices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      JOIN public.courses c ON c.id = q.course_id
      WHERE qq.id = quiz_choices.question_id
        AND (public.auth_role() = 'admin' OR c.teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      JOIN public.courses c ON c.id = q.course_id
      WHERE qq.id = quiz_choices.question_id
        AND (public.auth_role() = 'admin' OR c.teacher_id = auth.uid())
    )
  );

-- ── GRANTs ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_choices TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
GRANT ALL ON public.quiz_questions TO service_role;
GRANT ALL ON public.quiz_choices TO service_role;

-- ── Storage: course-materials (private PDFs) ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-materials',
  'course-materials',
  false,
  20971520,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
