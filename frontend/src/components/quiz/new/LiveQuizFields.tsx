import {
  MAX_QUESTIONS,
  MIN_QUESTIONS,
} from "@/lib/quiz-labels";
import { inputClass } from "@/lib/ui/form-classes";

type LiveQuizFieldsProps = {
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  onQuestionCountChange: (value: number) => void;
  onDifficultyChange: (value: "easy" | "medium" | "hard") => void;
};

export function LiveQuizFields({
  questionCount,
  difficulty,
  onQuestionCountChange,
  onDifficultyChange,
}: LiveQuizFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="q-count" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
          Anzahl Fragen
        </label>
        <input
          id="q-count"
          type="number"
          min={MIN_QUESTIONS}
          max={MAX_QUESTIONS}
          value={questionCount}
          onChange={(e) => onQuestionCountChange(Number(e.target.value))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="difficulty" className="mb-1 block text-sm font-medium text-[#666666] dark:text-zinc-400">
          Schwierigkeit
        </label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value as typeof difficulty)}
          className={inputClass}
        >
          <option value="easy">Leicht</option>
          <option value="medium">Mittel</option>
          <option value="hard">Schwer</option>
        </select>
      </div>
    </div>
  );
}
