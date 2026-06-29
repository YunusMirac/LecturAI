"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { ExamPoolFields } from "@/components/quiz/new/ExamPoolFields";
import { LiveQuizFields } from "@/components/quiz/new/LiveQuizFields";
import { QuizTypeSelector } from "@/components/quiz/new/QuizTypeSelector";
import { createQuizFromPdf } from "@/lib/api/quizzesApi";
import { useRouteParams } from "@/lib/hooks/useRouteParams";
import { MAX_CHOICES, MIN_CHOICES } from "@/lib/quiz-labels";
import { inputClass } from "@/lib/ui/form-classes";

export default function QuizNewPageClient() {
  const { courseId } = useRouteParams();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [choiceCount, setChoiceCount] = useState(4);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [poolEasy, setPoolEasy] = useState(10);
  const [poolMedium, setPoolMedium] = useState(10);
  const [poolHard, setPoolHard] = useState(20);
  const [quizType, setQuizType] = useState<"live" | "exam">("live");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pdfFile) {
      setError("Bitte eine PDF-Datei auswählen.");
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.append("pdf", pdfFile);
    form.append("choice_count", String(choiceCount));
    form.append("quiz_type", quizType);
    if (quizType === "exam") {
      form.append("pool_easy", String(poolEasy));
      form.append("pool_medium", String(poolMedium));
      form.append("pool_hard", String(poolHard));
    } else {
      form.append("question_count", String(questionCount));
      form.append("difficulty", difficulty);
    }
    if (title.trim()) form.append("title", title.trim());

    const result = await createQuizFromPdf(courseId, form);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/dashboard/courses/${courseId}/quizzes/${result.quizId}`);
    router.refresh();
  }

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-xl px-2 py-4 sm:px-4">
        <DashboardBackLink href={`/dashboard/courses/${courseId}`} label="← Zurück zum Kurs" />

        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="mb-2 text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
            Quiz aus PDF erstellen
          </h1>
          <p className="mb-6 text-sm text-[#666666] dark:text-zinc-400">
            Lade deine Vorlesungsfolien hoch. Die KI erstellt Multiple-Choice-Fragen — du kannst
            sie danach bearbeiten, bevor du veröffentlichst.
          </p>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <QuizTypeSelector quizType={quizType} onChange={setQuizType} />

            <div>
              <label htmlFor="quiz-title" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                Titel (optional)
              </label>
              <input
                id="quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="z. B. Klausur Vorbereitung Woche 3"
              />
            </div>

            <div>
              <label htmlFor="quiz-pdf" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                Vorlesungs-PDF
              </label>
              <input
                id="quiz-pdf"
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="c-count" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                Antworten pro Frage
              </label>
              <input
                id="c-count"
                type="number"
                min={MIN_CHOICES}
                max={MAX_CHOICES}
                value={choiceCount}
                onChange={(e) => setChoiceCount(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            {quizType === "exam" ? (
              <ExamPoolFields
                poolEasy={poolEasy}
                poolMedium={poolMedium}
                poolHard={poolHard}
                onPoolEasyChange={setPoolEasy}
                onPoolMediumChange={setPoolMedium}
                onPoolHardChange={setPoolHard}
              />
            ) : (
              <LiveQuizFields
                questionCount={questionCount}
                difficulty={difficulty}
                onQuestionCountChange={setQuestionCount}
                onDifficultyChange={setDifficulty}
              />
            )}

            {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2a9d8f] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird hochgeladen…
                </>
              ) : (
                "Quiz generieren"
              )}
            </button>
          </form>
        </div>
      </div>
    </MarketingAuthShell>
  );
}
