import { MAX_POOL_PER_DIFFICULTY } from "@/lib/quiz-labels";
import { inputClass } from "@/lib/ui/form-classes";

type ExamPoolFieldsProps = {
  poolEasy: number;
  poolMedium: number;
  poolHard: number;
  onPoolEasyChange: (value: number) => void;
  onPoolMediumChange: (value: number) => void;
  onPoolHardChange: (value: number) => void;
};

export function ExamPoolFields({
  poolEasy,
  poolMedium,
  poolHard,
  onPoolEasyChange,
  onPoolMediumChange,
  onPoolHardChange,
}: ExamPoolFieldsProps) {
  const poolTotal = poolEasy + poolMedium + poolHard;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[#666666] dark:text-zinc-400">
        Fragenpool pro Schwierigkeit (KI generiert)
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pool-easy" className="mb-1 block text-xs font-medium text-[#666666] dark:text-zinc-400">
            Leicht
          </label>
          <input
            id="pool-easy"
            type="number"
            min={0}
            max={MAX_POOL_PER_DIFFICULTY}
            value={poolEasy}
            onChange={(e) => onPoolEasyChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pool-medium" className="mb-1 block text-xs font-medium text-[#666666] dark:text-zinc-400">
            Mittel
          </label>
          <input
            id="pool-medium"
            type="number"
            min={0}
            max={MAX_POOL_PER_DIFFICULTY}
            value={poolMedium}
            onChange={(e) => onPoolMediumChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pool-hard" className="mb-1 block text-xs font-medium text-[#666666] dark:text-zinc-400">
            Schwer
          </label>
          <input
            id="pool-hard"
            type="number"
            min={0}
            max={MAX_POOL_PER_DIFFICULTY}
            value={poolHard}
            onChange={(e) => onPoolHardChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#666666] dark:text-zinc-400">
        Pool gesamt: <strong>{poolTotal}</strong> Fragen — die finale Klausur konfigurierst du später
        auf der Klausur-Seite.
      </p>
    </div>
  );
}
