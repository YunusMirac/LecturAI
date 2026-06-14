"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AccessCodePanel } from "@/components/quiz/AccessCodePanel";
import { Loader2, Play, Power, RotateCcw, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { LiveLeaderboardList } from "@/components/quiz/live/LiveLeaderboardList";
import { LiveRevealPanel } from "@/components/quiz/live/LiveRevealPanel";
import { LiveTimerBar } from "@/components/quiz/live/LiveTimerBar";
import {
  fetchLiveHostState,
  liveHostAction,
  type LiveHostState,
} from "@/lib/api/quizLiveApi";
import { QUESTION_SECONDS } from "@/lib/quiz-live-constants";
import { usePolling } from "@/lib/usePolling";

const POLL_MS = 1500;

export default function QuizLiveHostPage() {
  const params = useParams();
  const courseId = String(params.courseId ?? "");
  const quizId = String(params.quizId ?? "");

  const [state, setState] = useState<LiveHostState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await fetchLiveHostState(quizId);
    if (!silent) setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setState(result.state);
    setError(null);
  }, [quizId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  usePolling(load, POLL_MS);

  async function runAction(action: "open" | "close" | "start" | "reset") {
    setBusy(true);
    setActionMsg(null);
    const result = await liveHostAction(quizId, action);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setActionMsg(result.detail);
    await load(true);
  }

  function copyCode() {
    if (state?.access_code) {
      void navigator.clipboard.writeText(state.access_code);
      setActionMsg("Code kopiert!");
    }
  }

  if (loading && !state) {
    return (
      <MarketingAuthShell mainVariant="wide">
        <div className="flex min-h-[40vh] items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#2a9d8f]" />
        </div>
      </MarketingAuthShell>
    );
  }

  const qNum = (state?.current_question_index ?? 0) + 1;

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-4">
        <Link
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}`}
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Quiz
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#333333] dark:text-zinc-100">
            Live-Quiz steuern
          </h1>
          <p className="mt-1 text-[#666666] dark:text-zinc-400">{state?.title}</p>
          <p className="mt-1 text-xs text-[#777777]">30 Sekunden pro Frage (fest)</p>
        </div>

        {error ? <p className="mb-4 text-red-600">{error}</p> : null}
        {actionMsg ? (
          <p className="mb-4 text-sm font-medium text-[#2a9d8f]">{actionMsg}</p>
        ) : null}

        <div className="glass-panel mb-6 rounded-2xl p-6">
          <h2 className="mb-4 text-base font-semibold text-[#2a9d8f]">Zugang & Steuerung</h2>

          {!state?.live_open ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("open")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
            >
              <Power className="h-4 w-4" />
              Für Schüler öffnen (Code erzeugen)
            </button>
          ) : (
            <div className="space-y-4">
              <AccessCodePanel code={state.access_code ?? ""} onCopy={copyCode} />
              <p className="text-sm text-[#666666]">
                Schüler:innen öffnen den Kurs im Dashboard, wählen dieses Quiz und geben dort den
                Code ein.
              </p>

              <div className="flex flex-wrap gap-2">
                {state.live_status === "lobby" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction("start")}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    Quiz starten
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("close")}
                  className="rounded-xl border border-red-300/60 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300"
                >
                  Schließen
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction("reset")}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold"
                >
                  <RotateCcw className="h-4 w-4" />
                  Neue Runde
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel mb-6 rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2a9d8f]" />
            <h2 className="text-base font-semibold text-[#2a9d8f]">
              Teilnehmer ({state?.participants.length ?? 0})
            </h2>
          </div>
          {state && state.participants.length === 0 ? (
            <p className="text-sm text-[#666666]">Noch niemand mit Code beigetreten.</p>
          ) : state ? (
            <ul className="space-y-2">
              {state.participants.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between rounded-xl bg-white/30 px-4 py-2 text-sm dark:bg-zinc-900/30"
                >
                  <span className="truncate pr-2">{p.display_email}</span>
                  {state.live_status !== "lobby" && state.live_status !== "idle" ? (
                    <span className="shrink-0 font-semibold tabular-nums text-[#2a9d8f]">
                      {p.total_score} Pkt.
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {state?.live_status === "question" && state.question ? (
          <div className="glass-panel space-y-4 rounded-2xl p-6">
            {state.seconds_remaining !== null ? (
              <LiveTimerBar
                secondsRemaining={state.seconds_remaining}
                totalSeconds={QUESTION_SECONDS}
              />
            ) : null}
            <p className="text-sm font-semibold text-[#2a9d8f]">
              Frage {qNum} / {state.total_questions}
            </p>
            <h3 className="text-lg font-bold leading-snug">{state.question.prompt}</h3>
            <p className="text-sm text-[#666666]">
              Antworten: {state.answered_count} / {state.participants.length}
              {state.all_answered_current ? " — alle fertig, Ergebnis gleich…" : ""}
            </p>
          </div>
        ) : null}

        {state?.live_status === "reveal" && state.question ? (
          <LiveRevealPanel
            prompt={state.question.prompt}
            questionNumber={qNum}
            totalQuestions={state.total_questions}
            correctChoiceId={state.correct_choice_id}
            choiceStats={state.choice_stats}
            topThree={state.top_three}
            revealSecondsRemaining={state.reveal_seconds_remaining}
          />
        ) : null}

        {state?.live_status === "finished" && state.leaderboard.length > 0 ? (
          <div className="glass-panel mt-6 rounded-2xl p-6">
            <LiveLeaderboardList entries={state.leaderboard} />
          </div>
        ) : null}
      </div>
    </MarketingAuthShell>
  );
}
