"use client";

import { useCallback, useState } from "react";

import { DashboardAsyncPage } from "@/components/dashboard/DashboardAsyncPage";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { ExamConfigForm } from "@/components/quiz/exam/ExamConfigForm";
import { ExamControlPanel } from "@/components/quiz/exam/ExamControlPanel";
import {
  examTeacherAction,
  fetchExamMeta,
  saveExamConfig,
  type ExamMeta,
} from "@/lib/api/examApi";
import { useActionState } from "@/lib/hooks/useActionState";
import { useAsyncResource } from "@/lib/hooks/useAsyncResource";
import { useRouteParams } from "@/lib/hooks/useRouteParams";
import { EXAM_DURATION_SECONDS } from "@/lib/quiz-exam-constants";

export default function ExamManagePageClient() {
  const { courseId, quizId } = useRouteParams();
  const { actionMsg, actionErr, busy, setActionMsg, setActionErr, setBusy } = useActionState();

  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [drawEasy, setDrawEasy] = useState(0);
  const [drawMedium, setDrawMedium] = useState(0);
  const [drawHard, setDrawHard] = useState(0);
  const [savingConfig, setSavingConfig] = useState(false);

  function applyMetaToForm(meta: ExamMeta) {
    setAccessCode(meta.access_code ?? null);
    const cfg = meta.exam_config;
    setDurationMinutes(
      Math.round((cfg?.duration_seconds ?? meta.duration_seconds ?? EXAM_DURATION_SECONDS) / 60),
    );
    setDrawEasy(cfg?.draw_counts.easy ?? 0);
    setDrawMedium(cfg?.draw_counts.medium ?? 0);
    setDrawHard(cfg?.draw_counts.hard ?? 0);
  }

  const load = useCallback(async () => {
    const result = await fetchExamMeta(quizId);
    if (!result.ok) {
      return { ok: false as const, message: result.message, notFound: result.notFound };
    }
    applyMetaToForm(result.meta);
    return { ok: true as const, data: result.meta };
  }, [quizId]);

  const { data: meta, loading, error, notFound, reload } = useAsyncResource(load);

  async function onAction(action: "open" | "close") {
    setBusy(true);
    setActionMsg(null);
    setActionErr(null);
    const result = await examTeacherAction(quizId, action);
    setBusy(false);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    setActionMsg(result.detail);
    if (result.access_code) setAccessCode(result.access_code);
    if (action === "close") setAccessCode(null);
    await reload(true);
  }

  async function onSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setActionMsg(null);
    setActionErr(null);
    const result = await saveExamConfig(quizId, {
      duration_minutes: durationMinutes,
      draw_easy: drawEasy,
      draw_medium: drawMedium,
      draw_hard: drawHard,
    });
    setSavingConfig(false);
    if (!result.ok) {
      setActionErr(result.message);
      return;
    }
    setActionMsg(result.detail);
    await reload(true);
  }

  function copyCode() {
    if (accessCode) {
      void navigator.clipboard.writeText(accessCode);
      setActionMsg("Code kopiert!");
    }
  }

  const submittedCount = meta?.results.filter((r) => !r.in_progress).length ?? 0;
  const displayDuration = meta?.duration_seconds ?? EXAM_DURATION_SECONDS;
  const configLocked = meta?.exam_open ?? false;
  const displayError = actionErr ?? error;

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-2xl px-2 py-4 sm:px-4">
        <DashboardBackLink
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}`}
          label="← Zurück zum Quiz"
        />

        <DashboardAsyncPage
          loading={loading}
          loadingLabel="Klausur wird geladen…"
          notFound={notFound}
          error={displayError}
          hasData={Boolean(meta)}
        >
          {meta ? (
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
                  <strong>{displayDuration / 60} Minuten</strong> Gesamtzeit. Jede:r erhält eine
                  individuelle, zufällige Fragenauswahl aus dem Pool.
                </p>
              </div>

              {actionMsg ? (
                <p className="mb-4 text-sm font-medium text-[#2a9d8f]">{actionMsg}</p>
              ) : null}

              <ExamConfigForm
                meta={meta}
                durationMinutes={durationMinutes}
                drawEasy={drawEasy}
                drawMedium={drawMedium}
                drawHard={drawHard}
                configLocked={configLocked}
                savingConfig={savingConfig}
                onDurationChange={setDurationMinutes}
                onDrawEasyChange={setDrawEasy}
                onDrawMediumChange={setDrawMedium}
                onDrawHardChange={setDrawHard}
                onSubmit={(e) => void onSaveConfig(e)}
              />

              <ExamControlPanel
                meta={meta}
                courseId={courseId}
                quizId={quizId}
                accessCode={accessCode}
                acting={busy}
                submittedCount={submittedCount}
                onOpen={() => void onAction("open")}
                onClose={() => void onAction("close")}
                onCopyCode={copyCode}
              />
            </>
          ) : null}
        </DashboardAsyncPage>
      </div>
    </MarketingAuthShell>
  );
}
