"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, Loader2, Radio, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { DashboardAsyncPage } from "@/components/dashboard/DashboardAsyncPage";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { AddQuestionForm } from "@/components/quiz/editor/AddQuestionForm";
import { ExamDifficultySections } from "@/components/quiz/editor/ExamDifficultySections";
import { QuestionCard } from "@/components/quiz/editor/QuestionCard";
import {
  EMPTY_CHOICES,
  emptyAddFormState,
  groupQuestionsByDifficulty,
  sortQuestions,
} from "@/components/quiz/editor/quiz-editor-utils";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import {
  addChoice,
  addQuestion,
  deleteChoice,
  deleteQuestion,
  deleteQuiz,
  fetchQuizDetail,
  publishQuiz,
  updateChoice,
  updateQuestion,
  type QuizDetail,
  type QuizDifficulty,
} from "@/lib/api/quizzesApi";
import { useActionState } from "@/lib/hooks/useActionState";
import { useAsyncResource } from "@/lib/hooks/useAsyncResource";
import { useRouteParams } from "@/lib/hooks/useRouteParams";
import { quizStatusLabelDe, quizTypeLabelDe } from "@/lib/quiz-labels";
import { usePolling } from "@/lib/usePolling";

const POLL_MS = 2500;

export default function QuizEditorPageClient() {
  const router = useRouter();
  const { courseId, quizId } = useRouteParams();
  const { actionMsg, actionErr, setActionMsg, setActionErr, clearActions } = useActionState();

  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [sectionForms, setSectionForms] = useState(emptyAddFormState);
  const [newPrompt, setNewPrompt] = useState("");
  const [newChoices, setNewChoices] = useState(EMPTY_CHOICES.map((c) => ({ ...c })));

  const loadQuiz = useCallback(async () => {
    const result = await fetchQuizDetail(quizId);
    if (!result.ok) {
      return { ok: false as const, message: result.message, notFound: result.notFound };
    }
    return { ok: true as const, data: result.quiz };
  }, [quizId]);

  const { data: quiz, loading, error, notFound, reload } = useAsyncResource(loadQuiz);
  usePolling(() => reload(true), POLL_MS, quiz?.status === "generating");

  const readOnly = quiz?.status === "published" || quiz?.status === "generating";
  const showDraftForms = quiz?.status === "draft" && !readOnly;

  const questionHandlers = {
    onDeleteQuestion: async (questionId: string) => {
      if (!confirm("Frage wirklich löschen?")) return;
      setActionErr(null);
      const result = await deleteQuestion(quizId, questionId);
      if (!result.ok) setActionErr(result.message);
      else await reload(true);
    },
    onSavePrompt: async (questionId: string, prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;
      const result = await updateQuestion(quizId, questionId, trimmed);
      if (!result.ok) setActionErr(result.message);
    },
    onSaveChoiceText: async (questionId: string, choiceId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const result = await updateChoice(quizId, questionId, choiceId, { text: trimmed });
      if (!result.ok) setActionErr(result.message);
    },
    onMarkCorrect: async (questionId: string, choiceId: string) => {
      const result = await updateChoice(quizId, questionId, choiceId, { is_correct: true });
      if (!result.ok) setActionErr(result.message);
      else await reload(true);
    },
    onDeleteChoice: async (questionId: string, choiceId: string) => {
      setActionErr(null);
      const result = await deleteChoice(quizId, questionId, choiceId);
      if (!result.ok) setActionErr(result.message);
      else await reload(true);
    },
    onAddChoice: async (questionId: string) => {
      setActionErr(null);
      const result = await addChoice(quizId, questionId, { text: "Neue Antwort", is_correct: false });
      if (!result.ok) setActionErr(result.message);
      else await reload(true);
    },
  };

  async function onPublish() {
    clearActions();
    setPublishing(true);
    const result = await publishQuiz(quizId);
    setPublishing(false);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    setActionMsg(result.detail);
    await reload(true);
  }

  async function onDeleteQuiz() {
    if (!confirm("Quiz wirklich löschen? Alle Fragen und Ergebnisse werden entfernt.")) return;
    setActionErr(null);
    setDeleting(true);
    const result = await deleteQuiz(quizId);
    setDeleting(false);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    router.push(`/dashboard/courses/${courseId}`);
    router.refresh();
  }

  async function onAddQuestion(e: React.FormEvent, difficulty?: QuizDifficulty) {
    e.preventDefault();
    setActionErr(null);
    const isExamSection = difficulty !== undefined;
    const prompt = isExamSection ? sectionForms[difficulty!].prompt.trim() : newPrompt.trim();
    const choices = isExamSection ? sectionForms[difficulty!].choices : newChoices;

    if (isExamSection && difficulty) {
      setSectionForms((prev) => ({ ...prev, [difficulty]: { ...prev[difficulty], adding: true } }));
    } else {
      setAddingQuestion(true);
    }

    const result = await addQuestion(quizId, {
      prompt,
      choices: choices.map((c) => ({ text: c.text.trim(), is_correct: c.is_correct })),
      ...(difficulty ? { difficulty } : {}),
    });

    if (isExamSection && difficulty) {
      setSectionForms((prev) => ({
        ...prev,
        [difficulty]: { prompt: "", choices: EMPTY_CHOICES.map((c) => ({ ...c })), adding: false },
      }));
    } else {
      setAddingQuestion(false);
    }

    if (!result.ok) {
      setActionErr(result.message);
      if (isExamSection && difficulty) {
        setSectionForms((prev) => ({
          ...prev,
          [difficulty]: { ...prev[difficulty], adding: false },
        }));
      }
      return;
    }

    if (!isExamSection) {
      setNewPrompt("");
      setNewChoices(EMPTY_CHOICES.map((c) => ({ ...c })));
    }
    await reload(true);
  }

  function renderQuestionCard(question: QuizDetail["questions"][number], qIndex: number) {
    return (
      <QuestionCard
        key={question.id}
        question={question}
        qIndex={qIndex}
        readOnly={readOnly}
        {...questionHandlers}
      />
    );
  }

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4">
        <DashboardBackLink href={`/dashboard/courses/${courseId}`} label="← Zurück zum Kurs" />

        <DashboardAsyncPage
          loading={loading}
          loadingLabel="Quiz wird geladen…"
          notFound={notFound}
          error={error}
          hasData={Boolean(quiz)}
        >
          {quiz ? (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-[#777777] dark:text-zinc-400">
                    Quiz bearbeiten
                  </p>
                  <h1 className="text-2xl font-extrabold text-[#333333] dark:text-zinc-100 sm:text-3xl">
                    {quiz.title}
                  </h1>
                  <p className="mt-2 text-sm text-[#666666] dark:text-zinc-400">
                    {quizTypeLabelDe(quiz.quiz_type)} · Status: {quizStatusLabelDe(quiz.status)}
                  </p>
                  {quiz.status === "published" && quiz.quiz_type === "exam" ? (
                    <Link
                      href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 bg-[#2a9d8f]/10 px-4 py-2.5 text-sm font-bold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/20"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Klausur verwalten
                    </Link>
                  ) : null}
                  {quiz.status === "published" && quiz.quiz_type !== "exam" ? (
                    <Link
                      href={`/dashboard/courses/${courseId}/quizzes/${quizId}/live`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 bg-[#2a9d8f]/10 px-4 py-2.5 text-sm font-bold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/20"
                    >
                      <Radio className="h-4 w-4" />
                      Live-Quiz (Kahoot-Modus)
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  {quiz.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => void onPublish()}
                      disabled={publishing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      {publishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Veröffentlichen
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void onDeleteQuiz()}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Quiz löschen
                  </button>
                </div>
              </div>

              {quiz.status === "generating" ? (
                <div className="glass-panel mb-6 flex items-center gap-4 rounded-2xl px-6 py-8">
                  <Loader2 className="h-8 w-8 shrink-0 animate-spin text-[#2a9d8f]" />
                  <div>
                    <p className="font-semibold text-[#333333] dark:text-zinc-100">KI erstellt Quiz…</p>
                    <p className="mt-1 text-sm text-[#666666] dark:text-zinc-400">
                      Das kann einige Sekunden dauern. Diese Seite aktualisiert sich automatisch.
                    </p>
                  </div>
                </div>
              ) : null}

              {quiz.status === "failed" ? (
                <div className="mb-6 rounded-2xl border border-red-300/50 bg-red-50/80 px-6 py-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
                  <p className="font-semibold">Generierung fehlgeschlagen</p>
                  <p className="mt-1 text-sm">
                    {quiz.generation_error ?? "Unbekannter Fehler — bitte Quiz neu erstellen."}
                  </p>
                  <Link
                    href={`/dashboard/courses/${courseId}/quizzes/new`}
                    className="mt-3 inline-block text-sm font-semibold underline"
                  >
                    Neues Quiz erstellen
                  </Link>
                </div>
              ) : null}

              {actionMsg ? (
                <p className="mb-4 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">{actionMsg}</p>
              ) : null}
              {actionErr ? (
                <p className="mb-4 text-sm text-red-600 dark:text-red-300">{actionErr}</p>
              ) : null}

              {quiz.status !== "generating" && quiz.status !== "failed" ? (
                quiz.quiz_type === "exam" ? (
                  <ExamDifficultySections
                    renderSection={(level) => {
                      const groups = groupQuestionsByDifficulty(quiz.questions);
                      return (
                        <>
                          {groups[level].map((q, i) => renderQuestionCard(q, i))}
                          {showDraftForms ? (
                            <AddQuestionForm
                              difficulty={level}
                              prompt={sectionForms[level].prompt}
                              choices={sectionForms[level].choices}
                              adding={sectionForms[level].adding}
                              onPromptChange={(value) =>
                                setSectionForms((prev) => ({
                                  ...prev,
                                  [level]: { ...prev[level], prompt: value },
                                }))
                              }
                              onChoicesChange={(choices) =>
                                setSectionForms((prev) => ({
                                  ...prev,
                                  [level]: { ...prev[level], choices },
                                }))
                              }
                              onSubmit={(e) => void onAddQuestion(e, level)}
                            />
                          ) : null}
                        </>
                      );
                    }}
                  />
                ) : (
                  <div className="space-y-6">
                    {sortQuestions(quiz.questions).map((q, i) => renderQuestionCard(q, i))}
                    {showDraftForms ? (
                      <AddQuestionForm
                        prompt={newPrompt}
                        choices={newChoices}
                        adding={addingQuestion}
                        onPromptChange={setNewPrompt}
                        onChoicesChange={setNewChoices}
                        onSubmit={(e) => void onAddQuestion(e)}
                      />
                    ) : null}
                  </div>
                )
              ) : null}
            </>
          ) : null}
        </DashboardAsyncPage>
      </div>
    </MarketingAuthShell>
  );
}
