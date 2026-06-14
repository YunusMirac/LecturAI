"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, Loader2, Radio } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import {
  fetchQuizJoinPreview,
  joinQuizByCode,
  type QuizJoinPreview,
} from "@/lib/api/quizLiveApi";

import { inputClassCode } from "@/lib/ui/form-classes";

export default function CourseQuizJoinPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.courseId ?? "");
  const quizId = String(params.quizId ?? "");

  const [preview, setPreview] = useState<QuizJoinPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isExam = preview?.quiz_type === "exam";
  const isOpen = isExam ? preview?.exam_open : preview?.live_open;

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    const result = await fetchQuizJoinPreview(quizId);
    setLoadingPreview(false);
    if (!result.ok) {
      setPreviewError(result.message);
      return;
    }
    setPreview(result.preview);

    if (result.preview.quiz_type === "live" && result.preview.already_joined && result.preview.live_open) {
      router.replace(`/dashboard/quiz/${quizId}/play`);
      return;
    }
    if (result.preview.quiz_type === "exam" && result.preview.in_progress) {
      router.replace(`/dashboard/courses/${courseId}/quizzes/${quizId}/take`);
    }
  }, [quizId, courseId, router]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPreview();
    });
  }, [loadPreview]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setSubmitting(true);
    const result = await joinQuizByCode(quizId, code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMsg(result.detail);
    if (result.quizType === "exam") {
      router.push(`/dashboard/courses/${courseId}/quizzes/${result.quizId}/take`);
    } else {
      router.push(`/dashboard/quiz/${result.quizId}/play`);
    }
  }

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-md px-2 py-8 sm:px-4">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Kurs
        </Link>

        {loadingPreview ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[#666666]">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
            Wird geladen…
          </div>
        ) : previewError ? (
          <div className="glass-panel rounded-2xl p-6 text-center">
            <p className="text-red-600 dark:text-red-300">{previewError}</p>
          </div>
        ) : preview ? (
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2a9d8f]/12">
                {isExam ? (
                  <ClipboardList className="h-5 w-5 text-[#2a9d8f]" />
                ) : (
                  <Radio className="h-5 w-5 text-[#2a9d8f]" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#333333] dark:text-zinc-100">
                  {preview.title}
                </h1>
                <p className="mt-1 text-sm text-[#666666] dark:text-zinc-400">
                  {isExam ? "Klausur — Zugangscode eingeben" : "Live-Quiz beitreten"}
                </p>
              </div>
            </div>

            {preview.already_submitted ? (
              <p className="mb-5 rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#1a5c54] dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-200">
                Du hast diese Klausur bereits abgeschickt.
              </p>
            ) : isOpen ? (
              <p className="mb-5 rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-sm text-[#1a5c54] dark:border-teal-500/30 dark:bg-teal-950/40 dark:text-teal-200">
                {isExam
                  ? "Der Lehrer hat die Klausur geöffnet. Gib den Code ein — danach startet deine 1-Stunden-Klausur."
                  : "Der Lehrer hat dieses Quiz geöffnet. Gib den Code ein, den du im Unterricht bekommen hast."}
              </p>
            ) : (
              <p className="mb-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
                {isExam
                  ? "Diese Klausur ist noch nicht geöffnet. Warte, bis deine Lehrkraft sie freigibt."
                  : "Dieses Quiz ist noch nicht geöffnet. Warte, bis deine Lehrkraft es freigibt."}
              </p>
            )}

            {!isExam && preview.already_joined ? (
              <Link
                href={`/dashboard/quiz/${quizId}/play`}
                className="mb-4 block rounded-xl bg-[#2a9d8f] py-3 text-center text-sm font-bold text-white hover:brightness-110"
              >
                Zur Warteliste →
              </Link>
            ) : null}

            {isExam && preview.in_progress ? (
              <Link
                href={`/dashboard/courses/${courseId}/quizzes/${quizId}/take`}
                className="mb-4 block rounded-xl bg-[#2a9d8f] py-3 text-center text-sm font-bold text-white hover:brightness-110"
              >
                Klausur fortsetzen →
              </Link>
            ) : null}

            {!preview.already_submitted ? (
              <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
                <div>
                  <label
                    htmlFor="access-code"
                    className="mb-2 block text-sm font-medium text-[#666666] dark:text-zinc-400"
                  >
                    Zugangscode
                  </label>
                  <input
                    id="access-code"
                    required
                    maxLength={8}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                    }
                    className={inputClassCode}
                    placeholder="ABC123"
                    autoComplete="off"
                    disabled={!isOpen && !preview.in_progress}
                  />
                </div>

                {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
                {msg ? <p className="text-sm font-medium text-[#2a9d8f]">{msg}</p> : null}

                <button
                  type="submit"
                  disabled={submitting || (!isOpen && !preview.in_progress) || code.length < 4}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2a9d8f] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isExam ? "Klausur starten" : "Beitreten"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </MarketingAuthShell>
  );
}
