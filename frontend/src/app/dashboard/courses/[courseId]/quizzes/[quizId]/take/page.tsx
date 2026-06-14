"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { LiveChoiceGrid } from "@/components/quiz/live/LiveChoiceGrid";
import {
  fetchExamPreview,
  saveExamAnswer,
  submitExam,
  type ExamAttemptState,
} from "@/lib/api/examApi";
import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ExamTakePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.courseId ?? "");
  const quizId = String(params.quizId ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ExamAttemptState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);
  const autoSubmitRef = useRef(false);

  const load = useCallback(async () => {
    const result = await fetchExamPreview(quizId);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (!result.preview.has_attempt || !result.preview.state) {
      router.replace(`/dashboard/courses/${courseId}/quizzes/${quizId}/join`);
      return;
    }
    setState(result.preview.state);
    if (result.preview.state.status === "in_progress") {
      setSecondsLeft(result.preview.state.seconds_remaining);
    }
  }, [quizId, courseId, router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!state || state.status !== "in_progress") return;

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0 && !autoSubmitRef.current) {
          autoSubmitRef.current = true;
          void submitExam(quizId).then((res) => {
            if (res.ok) setState(res.state);
          });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [state, quizId]);

  async function onSelectChoice(choiceId: string) {
    if (!state || state.status !== "in_progress") return;
    const question = state.questions[currentIndex];
    if (!question) return;

    const prev = state;
    setState({
      ...state,
      answers: { ...state.answers, [question.id]: choiceId },
    });

    const result = await saveExamAnswer(quizId, question.id, choiceId);
    if (!result.ok) {
      setState(prev);
      setError(result.message);
      return;
    }
    setState(result.state);
    if (result.state.status === "in_progress") {
      setSecondsLeft(result.state.seconds_remaining);
    }
  }

  async function onSubmitExam() {
    if (!confirm("Klausur wirklich abschicken? Du kannst danach nichts mehr ändern.")) return;
    setSubmitting(true);
    const result = await submitExam(quizId);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setState(result.state);
  }

  const question = state?.questions[currentIndex];
  const selectedId = question ? (state?.answers[question.id] ?? null) : null;
  const isLast = state ? currentIndex >= state.questions.length - 1 : false;
  const isFirst = currentIndex === 0;

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Kurs
        </Link>

        {loading ? (
          <div className="flex items-center gap-3 text-[#666666] dark:text-zinc-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
            Klausur wird geladen…
          </div>
        ) : error ? (
          <p className="text-red-600 dark:text-red-300">{error}</p>
        ) : state?.status === "submitted" ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <h1 className="mb-3 text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
              Klausur abgeschickt
            </h1>
            <p className="text-sm text-[#666666] dark:text-zinc-400">
              Vielen Dank! Deine Antworten wurden gespeichert. Du erfährst die Ergebnisse von deiner
              Lehrkraft.
            </p>
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="mt-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
            >
              Zurück zum Kurs
            </Link>
          </div>
        ) : state ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#777777] dark:text-zinc-400">
                  Klausur
                </p>
                <h1 className="text-xl font-extrabold text-[#333333] dark:text-zinc-100">
                  {state.title}
                </h1>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                  secondsLeft <= 300
                    ? "bg-red-500/15 text-red-700 dark:text-red-300"
                    : "bg-[#2a9d8f]/10 text-[#2a9d8f]"
                }`}
              >
                <Clock className="h-4 w-4" />
                {formatTime(secondsLeft)}
              </div>
            </div>

            {question ? (
              <div className="glass-panel rounded-2xl p-6 sm:p-8">
                <p className="mb-2 text-sm font-semibold text-[#2a9d8f]">
                  Frage {currentIndex + 1} von {state.questions.length}
                </p>
                <h2 className="mb-6 text-lg font-bold text-[#333333] dark:text-zinc-100">
                  {question.prompt}
                </h2>

                <LiveChoiceGrid
                  choices={question.choices}
                  selectedId={selectedId}
                  onSelect={(id) => void onSelectChoice(id)}
                />

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-[#666666] transition hover:border-[#2a9d8f]/40 disabled:opacity-40 dark:text-zinc-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Zurück
                  </button>

                  {isLast ? (
                    <button
                      type="button"
                      onClick={() => void onSubmitExam()}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Klausur abschicken
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentIndex((i) => Math.min(state.questions.length - 1, i + 1))
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-[#2a9d8f] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                    >
                      Weiter
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingAuthShell>
  );
}
