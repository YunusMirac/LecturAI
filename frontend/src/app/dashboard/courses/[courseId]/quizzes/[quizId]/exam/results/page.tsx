"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { fetchExamResults, type ExamResultSummary } from "@/lib/api/examApi";

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} %`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE");
}

export default function ExamResultsPage() {
  const params = useParams();
  const courseId = String(params.courseId ?? "");
  const quizId = String(params.quizId ?? "");

  const [title, setTitle] = useState("");
  const [results, setResults] = useState<ExamResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchExamResults(quizId);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setTitle(result.title);
    setResults(result.results);
  }, [quizId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4">
        <Link
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zur Klausur-Steuerung
        </Link>

        {loading ? (
          <div className="flex items-center gap-3 text-[#666666] dark:text-zinc-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
            Ergebnisse werden geladen…
          </div>
        ) : error ? (
          <p className="text-red-600 dark:text-red-300">{error}</p>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
              Ergebnisse — {title}
            </h1>
            <p className="mb-6 text-sm text-[#666666] dark:text-zinc-400">
              Übersicht aller Abgaben. Klicke auf eine Zeile für Details pro Schüler:in.
            </p>

            {results.length === 0 ? (
              <p className="text-sm text-[#666666] dark:text-zinc-400">
                Noch keine Abgaben vorhanden.
              </p>
            ) : (
              <div className="glass-panel overflow-hidden rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/30 text-xs font-semibold uppercase tracking-wider text-[#777777] dark:border-white/10 dark:text-zinc-400">
                      <th className="px-4 py-3">Schüler:in</th>
                      <th className="px-4 py-3">Abgegeben</th>
                      <th className="px-4 py-3">Richtig</th>
                      <th className="px-4 py-3">Prozent</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.attempt_id}
                        className="border-b border-white/20 transition hover:bg-white/20 dark:border-white/5 dark:hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam/results/${r.user_id}`}
                            className="font-medium text-[#2a9d8f] hover:underline"
                          >
                            {r.display_email}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#666666] dark:text-zinc-400">
                          {formatDate(r.submitted_at)}
                        </td>
                        <td className="px-4 py-3">
                          {r.correct_count !== null && r.total_count !== null
                            ? `${r.correct_count} / ${r.total_count}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {formatPercent(r.percent_correct)}
                        </td>
                        <td className="px-4 py-3">
                          {r.in_progress ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
                              Läuft
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#2a9d8f]/15 px-2 py-0.5 text-xs font-semibold text-[#2a9d8f]">
                              Abgeschickt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </MarketingAuthShell>
  );
}
