"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { createQuizFromPdf } from "@/lib/api/quizzesApi";
import { MAX_CHOICES, MAX_QUESTIONS, MIN_CHOICES, MIN_QUESTIONS } from "@/lib/quiz-labels";

import { inputClass } from "@/lib/ui/form-classes";

export default function NewQuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.courseId ?? "");

  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [choiceCount, setChoiceCount] = useState(4);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
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
    form.append("question_count", String(questionCount));
    form.append("choice_count", String(choiceCount));
    form.append("difficulty", difficulty);
    form.append("quiz_type", quizType);
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
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Kurs
        </Link>

        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h1 className="mb-2 text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
            Quiz aus PDF erstellen
          </h1>
          <p className="mb-6 text-sm text-[#666666] dark:text-zinc-400">
            Lade deine Vorlesungsfolien hoch. Die KI erstellt Multiple-Choice-Fragen — du kannst
            sie danach bearbeiten, bevor du veröffentlichst.
          </p>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <div>
              <p className="mb-2 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                Art
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setQuizType("live")}
                  className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                    quizType === "live"
                      ? "border-[#2a9d8f] bg-[#2a9d8f]/10"
                      : "border-white/40 bg-white/30 dark:border-white/10 dark:bg-zinc-900/30"
                  }`}
                >
                  <p className="font-bold text-[#333333] dark:text-zinc-100">Live-Quiz</p>
                  <p className="mt-1 text-xs text-[#666666] dark:text-zinc-400">
                    Kahoot-Modus — synchron, mit Rangliste
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setQuizType("exam")}
                  className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                    quizType === "exam"
                      ? "border-[#2a9d8f] bg-[#2a9d8f]/10"
                      : "border-white/40 bg-white/30 dark:border-white/10 dark:bg-zinc-900/30"
                  }`}
                >
                  <p className="font-bold text-[#333333] dark:text-zinc-100">Klausur</p>
                  <p className="mt-1 text-xs text-[#666666] dark:text-zinc-400">
                    Individuell, 1 h Gesamtzeit, ohne Sofort-Feedback
                  </p>
                </button>
              </div>
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="q-count" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                  Anzahl Fragen
                </label>
                <input
                  id="q-count"
                  type="number"
                  min={MIN_QUESTIONS}
                  max={MAX_QUESTIONS}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
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
              <div>
                <label htmlFor="difficulty" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
                  Schwierigkeit
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  className={inputClass}
                >
                  <option value="easy">Leicht</option>
                  <option value="medium">Mittel</option>
                  <option value="hard">Schwer</option>
                </select>
              </div>
            </div>

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
