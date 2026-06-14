"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, ClipboardList, Loader2, Plus, Radio, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  type QuizQuestion,
} from "@/lib/api/quizzesApi";
import { MAX_CHOICES, MIN_CHOICES, quizStatusLabelDe, quizTypeLabelDe } from "@/lib/quiz-labels";

import { inputClassCompact } from "@/lib/ui/form-classes";
import { usePolling } from "@/lib/usePolling";

const POLL_MS = 2500;

function sortQuestions(questions: QuizQuestion[]) {
  return [...questions].sort((a, b) => a.sort_order - b.sort_order);
}

function sortChoices(question: QuizQuestion) {
  return [...question.choices].sort((a, b) => a.sort_order - b.sort_order);
}

export default function QuizEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.courseId ?? "");
  const quizId = String(params.quizId ?? "");

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const [newPrompt, setNewPrompt] = useState("");
  const [newChoices, setNewChoices] = useState([
    { text: "", is_correct: true },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);

  const loadQuiz = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await fetchQuizDetail(quizId);
    if (!silent) setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    setQuiz(result.quiz);
    setError(null);
    return result.quiz;
  }, [quizId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadQuiz();
    });
  }, [loadQuiz]);

  usePolling(loadQuiz, POLL_MS, quiz?.status === "generating");

  const readOnly = quiz?.status === "published" || quiz?.status === "generating";

  async function onPublish() {
    setActionErr(null);
    setActionMsg(null);
    setPublishing(true);
    const result = await publishQuiz(quizId);
    setPublishing(false);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    setActionMsg(result.detail);
    await loadQuiz(true);
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

  async function onDeleteQuestion(questionId: string) {
    if (!confirm("Frage wirklich löschen?")) return;
    setActionErr(null);
    const result = await deleteQuestion(quizId, questionId);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    await loadQuiz(true);
  }

  async function onSavePrompt(questionId: string, prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const result = await updateQuestion(quizId, questionId, trimmed);
    if (!result.ok) setActionErr(result.message);
  }

  async function onSaveChoiceText(
    questionId: string,
    choiceId: string,
    text: string,
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const result = await updateChoice(quizId, questionId, choiceId, { text: trimmed });
    if (!result.ok) setActionErr(result.message);
  }

  async function onMarkCorrect(questionId: string, choiceId: string) {
    const result = await updateChoice(quizId, questionId, choiceId, { is_correct: true });
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    await loadQuiz(true);
  }

  async function onDeleteChoice(questionId: string, choiceId: string) {
    setActionErr(null);
    const result = await deleteChoice(quizId, questionId, choiceId);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    await loadQuiz(true);
  }

  async function onAddChoice(questionId: string) {
    setActionErr(null);
    const result = await addChoice(quizId, questionId, { text: "Neue Antwort", is_correct: false });
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    await loadQuiz(true);
  }

  async function onAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setActionErr(null);
    setAddingQuestion(true);
    const result = await addQuestion(quizId, {
      prompt: newPrompt.trim(),
      choices: newChoices.map((c) => ({ text: c.text.trim(), is_correct: c.is_correct })),
    });
    setAddingQuestion(false);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    setNewPrompt("");
    setNewChoices([
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ]);
    await loadQuiz(true);
  }

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Kurs
        </Link>

        {loading && !quiz ? (
          <div className="flex items-center gap-3 text-[#666666] dark:text-zinc-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
            Quiz wird geladen…
          </div>
        ) : error ? (
          <p className="text-red-600 dark:text-red-300">{error}</p>
        ) : quiz ? (
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
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Quiz löschen
              </button>
              </div>
            </div>

            {quiz.status === "generating" ? (
              <div className="glass-panel mb-6 flex items-center gap-4 rounded-2xl px-6 py-8">
                <Loader2 className="h-8 w-8 shrink-0 animate-spin text-[#2a9d8f]" />
                <div>
                  <p className="font-semibold text-[#333333] dark:text-zinc-100">
                    KI erstellt Quiz…
                  </p>
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
              <div className="space-y-6">
                {sortQuestions(quiz.questions).map((question, qIndex) => (
                  <div key={question.id} className="glass-panel rounded-2xl p-5 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#2a9d8f]">Frage {qIndex + 1}</p>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => void onDeleteQuestion(question.id)}
                          className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                          aria-label="Frage löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <label className="mb-1 block text-xs font-medium text-[#777777] dark:text-zinc-400">
                      Fragetext
                    </label>
                    <textarea
                      defaultValue={question.prompt}
                      disabled={readOnly}
                      rows={3}
                      className={`${inputClassCompact} mb-4 resize-y`}
                      onBlur={(e) => void onSavePrompt(question.id, e.target.value)}
                    />

                    <p className="mb-2 text-xs font-medium text-[#777777] dark:text-zinc-400">
                      Antworten (eine als richtig markieren)
                    </p>
                    <ul className="space-y-2">
                      {sortChoices(question).map((choice) => (
                        <li key={choice.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={choice.is_correct}
                            disabled={readOnly}
                            onChange={() => void onMarkCorrect(question.id, choice.id)}
                            className="h-4 w-4 accent-[#2a9d8f]"
                            aria-label="Richtige Antwort"
                          />
                          <input
                            type="text"
                            defaultValue={choice.text}
                            disabled={readOnly}
                            className={`${inputClassCompact} flex-1`}
                            onBlur={(e) =>
                              void onSaveChoiceText(question.id, choice.id, e.target.value)
                            }
                          />
                          {!readOnly && question.choices.length > MIN_CHOICES ? (
                            <button
                              type="button"
                              onClick={() => void onDeleteChoice(question.id, choice.id)}
                              className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                              aria-label="Antwort löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {!readOnly && question.choices.length < MAX_CHOICES ? (
                      <button
                        type="button"
                        onClick={() => void onAddChoice(question.id)}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#2a9d8f] hover:underline"
                      >
                        <Plus className="h-4 w-4" />
                        Antwort hinzufügen
                      </button>
                    ) : null}
                  </div>
                ))}

                {quiz.status === "draft" ? (
                  <div className="glass-panel rounded-2xl p-5 sm:p-6">
                    <h2 className="mb-4 text-base font-semibold text-[#2a9d8f]">
                      Frage manuell hinzufügen
                    </h2>
                    <form onSubmit={(e) => void onAddQuestion(e)} className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#777777] dark:text-zinc-400">
                          Fragetext
                        </label>
                        <textarea
                          required
                          value={newPrompt}
                          onChange={(e) => setNewPrompt(e.target.value)}
                          rows={2}
                          className={inputClassCompact}
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[#777777] dark:text-zinc-400">
                          Antworten
                        </p>
                        {newChoices.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="new-correct"
                              checked={c.is_correct}
                              onChange={() =>
                                setNewChoices((prev) =>
                                  prev.map((x, j) => ({ ...x, is_correct: j === i })),
                                )
                              }
                              className="h-4 w-4 accent-[#2a9d8f]"
                            />
                            <input
                              type="text"
                              required
                              value={c.text}
                              onChange={(e) =>
                                setNewChoices((prev) =>
                                  prev.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                                )
                              }
                              className={`${inputClassCompact} flex-1`}
                              placeholder={`Antwort ${i + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={addingQuestion}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 px-4 py-2.5 text-sm font-semibold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/10 disabled:opacity-50"
                      >
                        {addingQuestion ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Frage hinzufügen
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingAuthShell>
  );
}
