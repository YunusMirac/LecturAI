"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { LiveChoiceGrid } from "@/components/quiz/live/LiveChoiceGrid";
import { LiveLeaderboardList } from "@/components/quiz/live/LiveLeaderboardList";
import { LiveRevealPanel } from "@/components/quiz/live/LiveRevealPanel";
import { LiveTimerBar } from "@/components/quiz/live/LiveTimerBar";
import {
  fetchLivePlayState,
  submitLiveAnswer,
  type LivePlayState,
} from "@/lib/api/quizLiveApi";
import { QUESTION_SECONDS } from "@/lib/quiz-live-constants";
import { usePolling } from "@/lib/usePolling";

const POLL_MS = 1500;

export default function QuizPlayPage() {
  const params = useParams();
  const quizId = String(params.quizId ?? "");

  const [state, setState] = useState<LivePlayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await fetchLivePlayState(quizId);
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

  async function onChoose(choiceId: string) {
    if (submitting || state?.my_choice_id) return;
    setSubmitting(true);
    const result = await submitLiveAnswer(quizId, choiceId);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await load(true);
  }

  if (loading && !state) {
    return (
      <MarketingAuthShell mainVariant="wide">
        <div className="flex min-h-[50vh] items-center justify-center gap-3 text-[#666666]">
          <Loader2 className="h-8 w-8 animate-spin text-[#2a9d8f]" />
          Quiz wird geladen…
        </div>
      </MarketingAuthShell>
    );
  }

  if (error && !state) {
    return (
      <MarketingAuthShell mainVariant="wide">
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-[#2a9d8f] underline">
            Zurück zum Dashboard
          </Link>
        </div>
      </MarketingAuthShell>
    );
  }

  if (!state) return null;

  const qNum = state.current_question_index + 1;

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-2xl px-2 py-6 sm:px-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="truncate text-lg font-bold text-[#333333] dark:text-zinc-100">{state.title}</h1>
          {state.live_status === "question" && state.seconds_remaining !== null ? (
            <span className="shrink-0 rounded-full bg-[#2a9d8f]/15 px-3 py-1 text-sm font-bold tabular-nums text-[#2a9d8f]">
              {state.seconds_remaining}s
            </span>
          ) : null}
        </div>

        {state.live_status === "lobby" || state.live_status === "idle" ? (
          <div className="glass-panel flex flex-col items-center rounded-2xl px-6 py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-[#2a9d8f]" />
            <p className="text-xl font-bold text-[#333333] dark:text-zinc-100">Warteliste</p>
            <p className="mt-2 max-w-sm text-[#666666] dark:text-zinc-400">
              Du bist angemeldet. Warte, bis der Lehrer auf <strong>Start</strong> drückt.
            </p>
            <p className="mt-4 text-sm text-[#777777]">
              {state.participants_waiting} Teilnehmer:in(nen) bereit
            </p>
            <Loader2 className="mt-6 h-8 w-8 animate-spin text-[#2a9d8f]" />
          </div>
        ) : null}

        {state.live_status === "question" && state.question ? (
          <div className="space-y-5">
            {state.seconds_remaining !== null ? (
              <LiveTimerBar
                secondsRemaining={state.seconds_remaining}
                totalSeconds={QUESTION_SECONDS}
              />
            ) : null}

            <div className="glass-panel rounded-2xl p-5 sm:p-6">
              <p className="mb-1 text-sm font-semibold text-[#2a9d8f]">
                Frage {qNum} / {state.total_questions}
              </p>
              <h2 className="text-xl font-bold leading-snug text-[#333333] dark:text-zinc-100">
                {state.question.prompt}
              </h2>
            </div>

            <LiveChoiceGrid
              choices={state.question.choices}
              selectedId={state.my_choice_id}
              disabled={Boolean(state.my_choice_id) || submitting}
              onSelect={(id) => void onChoose(id)}
            />

            {state.my_choice_id ? (
              <div className="rounded-xl border border-[#2a9d8f]/30 bg-[#2a9d8f]/10 px-4 py-3 text-center text-sm">
                <p className="font-semibold text-[#2a9d8f]">Antwort gesendet</p>
                <p className="mt-1 text-[#666666] dark:text-zinc-400">
                  {state.answered_count} / {state.participants_waiting} haben geantwortet
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {state.live_status === "reveal" && state.question ? (
          <LiveRevealPanel
            prompt={state.question.prompt}
            questionNumber={qNum}
            totalQuestions={state.total_questions}
            correctChoiceId={state.correct_choice_id}
            choiceStats={state.choice_stats}
            topThree={state.top_three}
            revealSecondsRemaining={state.reveal_seconds_remaining}
            myChoiceId={state.my_choice_id}
          />
        ) : null}

        {state.live_status === "finished" ? (
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            <LiveLeaderboardList entries={state.leaderboard} />
            <Link
              href="/dashboard"
              className="mt-8 block text-center text-sm font-semibold text-[#2a9d8f] hover:underline"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}
      </div>
    </MarketingAuthShell>
  );
}
