import { Loader2, Save, Settings } from "lucide-react";

import type { ExamMeta } from "@/lib/api/examApi";
import { inputClass } from "@/lib/ui/form-classes";

type ExamConfigFormProps = {
  meta: ExamMeta;
  durationMinutes: number;
  drawEasy: number;
  drawMedium: number;
  drawHard: number;
  configLocked: boolean;
  savingConfig: boolean;
  onDurationChange: (value: number) => void;
  onDrawEasyChange: (value: number) => void;
  onDrawMediumChange: (value: number) => void;
  onDrawHardChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function ExamConfigForm({
  meta,
  durationMinutes,
  drawEasy,
  drawMedium,
  drawHard,
  configLocked,
  savingConfig,
  onDurationChange,
  onDrawEasyChange,
  onDrawMediumChange,
  onDrawHardChange,
  onSubmit,
}: ExamConfigFormProps) {
  const pool = meta.pool_counts;
  if (!meta.can_manage || !pool) return null;

  return (
    <form onSubmit={onSubmit} className="glass-panel mb-6 rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5 text-[#2a9d8f]" />
        <span className="font-semibold text-[#333333] dark:text-zinc-100">Klausur-Einstellungen</span>
      </div>
      <p className="mb-4 text-sm text-[#666666] dark:text-zinc-400">
        Pool: {pool.easy} leicht · {pool.medium} mittel · {pool.hard} schwer (
        {pool.easy + pool.medium + pool.hard} gesamt)
      </p>

      <div className="mb-4">
        <label
          htmlFor="duration-minutes"
          className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400"
        >
          Zeitlimit (Minuten)
        </label>
        <input
          id="duration-minutes"
          type="number"
          min={5}
          max={120}
          value={durationMinutes}
          disabled={configLocked}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className={inputClass}
        />
      </div>

      <p className="mb-2 text-sm font-medium text-[#666666] dark:text-zinc-400">
        Fragen pro Klausur (aus Pool ziehen)
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="draw-easy" className="mb-1 block text-xs text-[#666666] dark:text-zinc-400">
            Leicht (max. {pool.easy})
          </label>
          <input
            id="draw-easy"
            type="number"
            min={0}
            max={pool.easy}
            value={drawEasy}
            disabled={configLocked}
            onChange={(e) => onDrawEasyChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="draw-medium" className="mb-1 block text-xs text-[#666666] dark:text-zinc-400">
            Mittel (max. {pool.medium})
          </label>
          <input
            id="draw-medium"
            type="number"
            min={0}
            max={pool.medium}
            value={drawMedium}
            disabled={configLocked}
            onChange={(e) => onDrawMediumChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="draw-hard" className="mb-1 block text-xs text-[#666666] dark:text-zinc-400">
            Schwer (max. {pool.hard})
          </label>
          <input
            id="draw-hard"
            type="number"
            min={0}
            max={pool.hard}
            value={drawHard}
            disabled={configLocked}
            onChange={(e) => onDrawHardChange(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-[#666666] dark:text-zinc-400">
        Klausur-Umfang: {drawEasy + drawMedium + drawHard} Fragen — pro Schüler:in zufällig ausgewählt
        und gemischt.
      </p>

      {!configLocked ? (
        <button
          type="submit"
          disabled={savingConfig}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 bg-[#2a9d8f]/10 px-5 py-2.5 text-sm font-bold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/20 disabled:opacity-50"
        >
          {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Einstellungen speichern
        </button>
      ) : (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-200">
          Einstellungen sind gesperrt, solange die Klausur geöffnet ist oder Versuche laufen.
        </p>
      )}
    </form>
  );
}
