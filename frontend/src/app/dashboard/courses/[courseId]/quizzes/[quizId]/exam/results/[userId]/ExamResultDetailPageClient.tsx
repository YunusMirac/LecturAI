"use client";

import { Check, X } from "lucide-react";
import { useCallback } from "react";

import { DashboardAsyncPage } from "@/components/dashboard/DashboardAsyncPage";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { fetchExamResultDetail } from "@/lib/api/examApi";
import { useAsyncResource } from "@/lib/hooks/useAsyncResource";
import { useRouteParams } from "@/lib/hooks/useRouteParams";

export default function ExamResultDetailPageClient() {
  const { courseId, quizId, userId } = useRouteParams();

  const load = useCallback(async () => {
    const result = await fetchExamResultDetail(quizId, userId);
    if (!result.ok) {
      return { ok: false as const, message: result.message, notFound: result.notFound };
    }
    return { ok: true as const, data: result.detail };
  }, [quizId, userId]);

  const { data: detail, loading, error, notFound } = useAsyncResource(load);

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
        <DashboardBackLink
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam/results`}
          label="← Zurück zur Übersicht"
        />

        <DashboardAsyncPage
          loading={loading}
          loadingLabel="Details werden geladen…"
          notFound={notFound}
          error={error}
          hasData={Boolean(detail)}
        >
          {detail ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
                  {detail.display_email}
                </h1>
                {detail.in_progress ? (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-200">
                    Klausur läuft noch — Ergebnis unvollständig.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[#666666] dark:text-zinc-400">
                    {detail.correct_count} von {detail.total_count} richtig (
                    {detail.percent_correct?.toFixed(1) ?? "—"} %)
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {detail.questions.map((q, i) => (
                  <div key={q.question_id} className="glass-panel rounded-2xl p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#2a9d8f]">Frage {i + 1}</p>
                      {q.is_correct === true ? (
                        <Check className="h-5 w-5 shrink-0 text-[#2a9d8f]" />
                      ) : q.is_correct === false ? (
                        <X className="h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
                      ) : null}
                    </div>
                    <p className="mb-4 font-medium text-[#333333] dark:text-zinc-100">{q.prompt}</p>
                    <div className="space-y-2 text-sm">
                      <p className="text-[#666666] dark:text-zinc-400">
                        Antwort:{" "}
                        <span className="font-medium text-[#333333] dark:text-zinc-200">
                          {q.choice_text ?? "— (keine Antwort)"}
                        </span>
                      </p>
                      {q.is_correct === false ? (
                        <p className="text-[#666666] dark:text-zinc-400">
                          Richtig wäre:{" "}
                          <span className="font-medium text-[#2a9d8f]">{q.correct_choice_text}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DashboardAsyncPage>
      </div>
    </MarketingAuthShell>
  );
}
