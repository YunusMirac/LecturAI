"use client";

import Link from "next/link";
import { useCallback } from "react";

import { DashboardAsyncPage } from "@/components/dashboard/DashboardAsyncPage";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { fetchExamResults, type ExamResultSummary } from "@/lib/api/examApi";
import { useAsyncResource } from "@/lib/hooks/useAsyncResource";
import { useRouteParams } from "@/lib/hooks/useRouteParams";

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} %`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE");
}

export default function ExamResultsPageClient() {
  const { courseId, quizId } = useRouteParams();

  const load = useCallback(async () => {
    const result = await fetchExamResults(quizId);
    if (!result.ok) {
      return { ok: false as const, message: result.message, notFound: result.notFound };
    }
    return {
      ok: true as const,
      data: { title: result.title, results: result.results },
    };
  }, [quizId]);

  const { data, loading, error, notFound } = useAsyncResource(load);
  const title = data?.title ?? "";
  const results = data?.results ?? [];

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4">
        <DashboardBackLink
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam`}
          label="← Zurück zur Klausur-Steuerung"
        />

        <DashboardAsyncPage
          loading={loading}
          loadingLabel="Ergebnisse werden geladen…"
          notFound={notFound}
          error={error}
          hasData={Boolean(data)}
        >
          {data ? (
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
                      {results.map((r: ExamResultSummary) => (
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
                            {r.in_progress
                              ? "—"
                              : `${r.correct_count ?? 0} / ${r.total_count ?? 0}`}
                          </td>
                          <td className="px-4 py-3">{formatPercent(r.percent_correct)}</td>
                          <td className="px-4 py-3">
                            {r.in_progress ? (
                              <span className="text-amber-700 dark:text-amber-200">Läuft</span>
                            ) : (
                              <span className="text-[#2a9d8f]">Abgeschickt</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </DashboardAsyncPage>
      </div>
    </MarketingAuthShell>
  );
}
