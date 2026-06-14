"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessCodePanel } from "@/components/quiz/AccessCodePanel";
import { BarChart3, Loader2, Power, Users } from "lucide-react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { examTeacherAction, fetchExamMeta, type ExamMeta } from "@/lib/api/examApi";
import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";
import { useCallback, useEffect, useState } from "react";

export default function ExamManagePage() {
  const params = useParams();
  const courseId = String(params.courseId ?? "");
  const quizId = String(params.quizId ?? "");

  const [meta, setMeta] = useState<ExamMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchExamMeta(quizId);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMeta(result.meta);
    setAccessCode(result.meta.access_code ?? null);
    setError(null);
  }, [quizId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function onAction(action: "open" | "close") {
    setActing(true);
    setActionMsg(null);
    const result = await examTeacherAction(quizId, action);
    setActing(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setActionMsg(result.detail);
    if (result.access_code) setAccessCode(result.access_code);
    if (action === "close") setAccessCode(null);
    await load();
  }

  function copyCode() {
    if (accessCode) {
      void navigator.clipboard.writeText(accessCode);
      setActionMsg("Code kopiert!");
    }
  }

  const submittedCount = meta?.results.filter((r) => !r.in_progress).length ?? 0;

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
        <Link
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Quiz
        </Link>

        {loading ? (
          <div className="flex items-center gap-3 text-[#666666] dark:text-zinc-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
            Klausur wird geladen…
          </div>
        ) : error ? (
          <p className="text-red-600 dark:text-red-300">{error}</p>
        ) : meta ? (
          <>
            <div className="mb-8">
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-[#777777] dark:text-zinc-400">
                Klausur-Modus
              </p>
              <h1 className="text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
                {meta.title}
              </h1>
              <p className="mt-2 text-sm text-[#666666] dark:text-zinc-400">
                Schüler:innen geben den <strong>Zugangscode</strong> ein und haben dann{" "}
                <strong>{EXAM_DURATION_SECONDS / 60} Minuten</strong> Gesamtzeit. Nach dem Schließen
                kann niemand mehr beitreten — Ergebnisse bleiben einsehbar.
              </p>
            </div>

            {actionMsg ? (
              <p className="mb-4 text-sm font-medium text-[#2a9d8f]">{actionMsg}</p>
            ) : null}

            <div className="glass-panel mb-6 rounded-2xl p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#2a9d8f]" />
                <span className="font-semibold text-[#333333] dark:text-zinc-100">
                  Status: {meta.exam_open ? "Geöffnet für Schüler:innen" : "Geschlossen"}
                </span>
              </div>

              {meta.exam_open && accessCode ? (
                <AccessCodePanel code={accessCode} onCopy={copyCode} />
              ) : null}

              <div className="flex flex-wrap gap-3">
                {!meta.exam_open ? (
                  <button
                    type="button"
                    disabled={acting || meta.status !== "published"}
                    onClick={() => void onAction("open")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                    Für Schüler öffnen
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void onAction("close")}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-500/10 dark:text-red-300"
                  >
                    Schließen
                  </button>
                )}

                <Link
                  href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam/results`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 bg-[#2a9d8f]/10 px-5 py-3 text-sm font-bold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/20"
                >
                  <BarChart3 className="h-4 w-4" />
                  Ergebnisse ansehen ({submittedCount})
                </Link>
              </div>

              {!meta.exam_open && submittedCount > 0 ? (
                <p className="mt-4 text-sm text-[#666666] dark:text-zinc-400">
                  Klausur geschlossen — neue Beitritte sind nicht mehr möglich. Du kannst jederzeit
                  die Einzelergebnisse der Schüler:innen einsehen.
                </p>
              ) : null}

              {meta.status !== "published" ? (
                <p className="mt-4 text-sm text-amber-700 dark:text-amber-200">
                  Die Klausur muss zuerst veröffentlicht werden, bevor Schüler:innen starten können.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </MarketingAuthShell>
  );
}
