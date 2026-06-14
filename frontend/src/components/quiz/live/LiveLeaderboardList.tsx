"use client";

import { Trophy } from "lucide-react";

import type { LiveLeaderboardEntry } from "@/lib/server/quiz-live-types";

type LiveLeaderboardListProps = {
  entries: LiveLeaderboardEntry[];
  title?: string;
};

export function LiveLeaderboardList({
  entries,
  title = "Rangliste",
}: LiveLeaderboardListProps) {
  if (entries.length === 0) {
    return <p className="text-center text-sm text-[#666666]">Keine Ergebnisse.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-center gap-2">
        <Trophy className="h-7 w-7 text-amber-500" />
        <h2 className="text-xl font-extrabold text-[#333333] dark:text-zinc-100">{title}</h2>
      </div>
      <ol className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.user_id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              entry.rank <= 3
                ? "bg-[#2a9d8f]/10 font-semibold ring-1 ring-[#2a9d8f]/20"
                : "bg-white/25 dark:bg-zinc-900/30"
            }`}
          >
            <span className="min-w-0 truncate pr-2">
              #{entry.rank} · {entry.display_email}
            </span>
            <span className="shrink-0 tabular-nums text-[#2a9d8f]">{entry.total_score} Pkt.</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
