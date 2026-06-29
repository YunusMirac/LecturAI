import { Loader2, Plus } from "lucide-react";

import type { QuizDifficulty } from "@/lib/quiz/domain";
import { difficultyLabelDe } from "@/lib/quiz-labels";
import { inputClassCompact } from "@/lib/ui/form-classes";

import type { ChoiceDraft } from "./quiz-editor-utils";

type AddQuestionFormProps = {
  difficulty?: QuizDifficulty;
  prompt: string;
  choices: ChoiceDraft[];
  adding: boolean;
  onPromptChange: (value: string) => void;
  onChoicesChange: (choices: ChoiceDraft[]) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function AddQuestionForm({
  difficulty,
  prompt,
  choices,
  adding,
  onPromptChange,
  onChoicesChange,
  onSubmit,
}: AddQuestionFormProps) {
  const sectionLabel = difficulty ? difficultyLabelDe(difficulty) : null;

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-[#2a9d8f]">
        {sectionLabel ? `Frage hinzufügen (${sectionLabel})` : "Frage manuell hinzufügen"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#777777] dark:text-zinc-400">
            Fragetext
          </label>
          <textarea
            required
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={2}
            className={inputClassCompact}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#777777] dark:text-zinc-400">Antworten</p>
          {choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={difficulty ? `new-correct-${difficulty}` : "new-correct"}
                checked={c.is_correct}
                onChange={() =>
                  onChoicesChange(choices.map((x, j) => ({ ...x, is_correct: j === i })))
                }
                className="h-4 w-4 accent-[#2a9d8f]"
              />
              <input
                type="text"
                required
                value={c.text}
                onChange={(e) =>
                  onChoicesChange(
                    choices.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                  )
                }
                className={`${inputClassCompact} flex-1`}
                placeholder={`Antwort ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2a9d8f]/40 px-4 py-2.5 text-sm font-semibold text-[#2a9d8f] transition hover:bg-[#2a9d8f]/10 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Frage hinzufügen
        </button>
      </form>
    </div>
  );
}
