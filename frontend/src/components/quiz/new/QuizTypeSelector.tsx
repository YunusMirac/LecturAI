type QuizTypeSelectorProps = {
  quizType: "live" | "exam";
  onChange: (type: "live" | "exam") => void;
};

export function QuizTypeSelector({ quizType, onChange }: QuizTypeSelectorProps) {
  return (
    <div>
      <p className="mb-2 block text-sm font-medium text-[#666666] dark:text-zinc-400">Art</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("live")}
          className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
            quizType === "live"
              ? "border-[#2a9d8f] bg-[#2a9d8f]/10"
              : "border-white/40 bg-white/30 dark:border-white/10 dark:bg-zinc-900/30"
          }`}
        >
          <p className="font-bold text-[#333333] dark:text-zinc-100">Live-Quiz</p>
          <p className="mt-1 text-xs text-[#666666] dark:text-zinc-400">
            Kahoot-Modus — synchron, mit Rangliste
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange("exam")}
          className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
            quizType === "exam"
              ? "border-[#2a9d8f] bg-[#2a9d8f]/10"
              : "border-white/40 bg-white/30 dark:border-white/10 dark:bg-zinc-900/30"
          }`}
        >
          <p className="font-bold text-[#333333] dark:text-zinc-100">Klausur</p>
          <p className="mt-1 text-xs text-[#666666] dark:text-zinc-400">
            Fragenpool mit Schwierigkeitsstufen — individuelle Klausur pro Schüler:in
          </p>
        </button>
      </div>
    </div>
  );
}
