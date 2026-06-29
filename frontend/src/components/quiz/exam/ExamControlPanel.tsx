import Link from "next/link";
import { BarChart3, Loader2, Power, Users } from "lucide-react";

import { AccessCodePanel } from "@/components/quiz/AccessCodePanel";
import type { ExamMeta } from "@/lib/api/examApi";

type ExamControlPanelProps = {
  meta: ExamMeta;
  courseId: string;
  quizId: string;
  accessCode: string | null;
  acting: boolean;
  submittedCount: number;
  onOpen: () => void;
  onClose: () => void;
  onCopyCode: () => void;
};

export function ExamControlPanel({
  meta,
  courseId,
  quizId,
  accessCode,
  acting,
  submittedCount,
  onOpen,
  onClose,
  onCopyCode,
}: ExamControlPanelProps) {
  return (
    <div className="glass-panel mb-6 rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-[#2a9d8f]" />
        <span className="font-semibold text-[#333333] dark:text-zinc-100">
          Status: {meta.exam_open ? "Geöffnet für Schüler:innen" : "Geschlossen"}
        </span>
      </div>

      {meta.exam_open && accessCode ? (
        <AccessCodePanel code={accessCode} onCopy={onCopyCode} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!meta.exam_open ? (
          <button
            type="button"
            disabled={acting || meta.status !== "published"}
            onClick={onOpen}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            Für Schüler öffnen
          </button>
        ) : (
          <button
            type="button"
            disabled={acting}
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-500/10 dark:text-red-300"
          >
            Schließen
          </button>
        )}

        <Link
          href={`/dashboard/courses/${courseId}/quizzes/${quizId}/exam/results`}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 bg-[#2a9d8f]/10 px-5 py-3 text-sm font-bold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/20"
        >
          <BarChart3 className="h-4 w-4" />
          Ergebnisse ansehen ({submittedCount})
        </Link>
      </div>

      {!meta.exam_open && submittedCount > 0 ? (
        <p className="mt-4 text-sm text-[#666666] dark:text-zinc-400">
          Klausur geschlossen — neue Beitritte sind nicht mehr möglich. Du kannst jederzeit die
          Einzelergebnisse der Schüler:innen einsehen.
        </p>
      ) : null}

      {meta.status !== "published" ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-200">
          Die Klausur muss zuerst veröffentlicht werden, bevor Schüler:innen starten können.
        </p>
      ) : null}
    </div>
  );
}
