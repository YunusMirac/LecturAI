"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import type { ChoiceStat, LiveLeaderboardEntry } from "@/lib/server/quiz-live-types";

type LiveRevealPanelProps = {
  prompt: string;
  questionNumber: number;
  totalQuestions: number;
  correctChoiceId: string | null;
  choiceStats: ChoiceStat[];
  topThree: LiveLeaderboardEntry[];
  revealSecondsRemaining: number | null;
  myChoiceId?: string | null;
};

export function LiveRevealPanel({
  prompt,
  questionNumber,
  totalQuestions,
  correctChoiceId,
  choiceStats,
  topThree,
  revealSecondsRemaining,
  myChoiceId = null,
}: LiveRevealPanelProps) {
  const maxCount = Math.max(1, ...choiceStats.map((s) => s.count));
  const myChoice = myChoiceId ? choiceStats.find((s) => s.choice_id === myChoiceId) : null;
  const iWasCorrect = myChoiceId != null && myChoiceId === correctChoiceId;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5 sm:p-6">
        <p className="mb-1 text-sm font-semibold text-[#2a9d8f]">
          Frage {questionNumber} / {totalQuestions} — Ergebnis
        </p>
        <h2 className="text-lg font-bold leading-snug text-[#333333] dark:text-zinc-100">{prompt}</h2>
      </div>

      {myChoice ? (
        <div
          className={`rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${
            iWasCorrect
              ? "border-emerald-500/40 bg-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-950/30"
              : "border-red-500/40 bg-red-500/10 dark:border-red-500/30 dark:bg-red-950/30"
          }`}
        >
          <div className="flex items-start gap-3">
            {iWasCorrect ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <div className="min-w-0">
              <p
                className={`text-sm font-bold ${iWasCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
              >
                {iWasCorrect ? "Richtig — das hast du gewählt" : "Deine Antwort war leider falsch"}
              </p>
              <p className="mt-1 text-sm leading-snug text-[#333333] dark:text-zinc-200">
                <span className="font-medium text-[#666666] dark:text-zinc-400">Deine Wahl: </span>
                {myChoice.text}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="glass-panel rounded-2xl p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#777777] dark:text-zinc-400">
          Antworten der Klasse
        </h3>
        <ul className="space-y-4">
          {choiceStats.map((stat) => {
            const pct = (stat.count / maxCount) * 100;
            const isCorrect = stat.choice_id === correctChoiceId;
            const isMine = myChoiceId === stat.choice_id;
            const barColor = isCorrect ? "bg-emerald-500" : "bg-red-500";

            return (
              <li
                key={stat.choice_id}
                className={`rounded-xl px-3 py-2 ${isMine ? "ring-2 ring-[#2a9d8f]/40 ring-offset-1 ring-offset-transparent" : ""}`}
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span
                      className={`line-clamp-2 min-w-0 flex-1 font-medium ${
                        isCorrect
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-[#333333] dark:text-zinc-200"
                      }`}
                    >
                      {stat.text}
                      {isCorrect ? " ✓" : ""}
                    </span>
                    {isMine ? (
                      <span className="shrink-0 rounded-full bg-[#2a9d8f]/15 px-2 py-0.5 text-xs font-bold text-[#2a9d8f] dark:bg-teal-900/40 dark:text-teal-200">
                        Deine Wahl
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 tabular-nums font-bold text-[#666666] dark:text-zinc-400">
                    {stat.count}×
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/40 dark:bg-zinc-800/60">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%`, minWidth: stat.count > 0 ? "4%" : "0" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-[#777777] dark:text-zinc-500">
          Grün = richtige Antwort · Rot = falsche Antworten (Anzahl der Auswahlen)
        </p>
      </div>

      {topThree.length > 0 ? (
        <div className="glass-panel rounded-2xl p-5 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#777777] dark:text-zinc-400">
            Top 3 (Gesamtpunkte)
          </h3>
          <div className="flex items-end justify-center gap-3 sm:gap-6">
            {[1, 0, 2].map((idx) => {
              const entry = topThree[idx];
              if (!entry) return null;
              const heights = ["h-24", "h-32", "h-20"];
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={entry.user_id} className="flex max-w-[8rem] flex-1 flex-col items-center">
                  <span className="mb-1 text-2xl">{medals[idx]}</span>
                  <p className="mb-2 line-clamp-2 w-full text-center text-xs font-semibold text-[#333333] dark:text-zinc-200">
                    {entry.display_email.split("@")[0]}
                  </p>
                  <div
                    className={`flex w-full items-end justify-center rounded-t-xl bg-[#2a9d8f]/20 ${heights[idx]}`}
                  >
                    <span className="pb-2 text-sm font-bold text-[#2a9d8f]">{entry.total_score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {revealSecondsRemaining !== null ? (
        <p className="text-center text-sm text-[#666666] dark:text-zinc-400">
          Nächste Frage in <strong>{revealSecondsRemaining}s</strong>…
        </p>
      ) : null}
    </div>
  );
}
