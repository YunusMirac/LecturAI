"use client";

type LiveChoiceGridProps = {
  choices: { id: string; text: string }[];
  selectedId?: string | null;
  disabled?: boolean;
  onSelect?: (choiceId: string) => void;
};

function fontSizeClass(text: string): string {
  const len = text.length;
  if (len > 120) return "text-xs leading-snug";
  if (len > 70) return "text-sm leading-snug";
  return "text-sm sm:text-base leading-snug";
}

function choiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function LiveChoiceGrid({
  choices,
  selectedId,
  disabled,
  onSelect,
}: LiveChoiceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {choices.map((c, i) => {
        const selected = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(c.id)}
            className={`group flex min-h-[5.5rem] items-stretch gap-3 rounded-2xl border-2 px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? "border-[#2a9d8f] bg-[#2a9d8f]/12 shadow-[0_0_0_1px_rgb(42_157_143_/_0.35),0_8px_28px_rgb(42_157_143_/_0.18)]"
                : "border-white/40 bg-white/35 hover:border-[#2a9d8f]/50 hover:bg-white/50 dark:border-white/10 dark:bg-zinc-900/40 dark:hover:border-teal-500/40 dark:hover:bg-zinc-900/55"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold transition ${
                selected
                  ? "bg-[#2a9d8f] text-white"
                  : "bg-[#2a9d8f]/12 text-[#2a9d8f] group-hover:bg-[#2a9d8f]/20 dark:bg-teal-950/50"
              }`}
            >
              {choiceLetter(i)}
            </span>
            <span
              className={`flex flex-1 items-center font-semibold text-[#333333] dark:text-zinc-100 ${fontSizeClass(c.text)}`}
            >
              <span className="line-clamp-4 break-words hyphens-auto">{c.text}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
