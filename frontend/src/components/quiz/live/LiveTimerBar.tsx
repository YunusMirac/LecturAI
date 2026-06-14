"use client";

type LiveTimerBarProps = {
  secondsRemaining: number;
  totalSeconds: number;
  label?: string;
};

export function LiveTimerBar({ secondsRemaining, totalSeconds, label }: LiveTimerBarProps) {
  const pct = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
  const urgent = secondsRemaining <= 5;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-[#666666] dark:text-zinc-400">
          {label ?? "Verbleibende Zeit"}
        </span>
        <span
          className={`tabular-nums text-lg font-bold ${urgent ? "text-red-600 dark:text-red-400" : "text-[#2a9d8f]"}`}
        >
          {secondsRemaining}s
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/40 dark:bg-zinc-800/60">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${urgent ? "bg-red-500" : "bg-[#2a9d8f]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
