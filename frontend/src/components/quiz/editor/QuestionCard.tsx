import { Plus, Trash2 } from "lucide-react";

import type { QuizQuestion } from "@/lib/api/quizzesApi";
import { MAX_CHOICES, MIN_CHOICES } from "@/lib/quiz-labels";
import { inputClassCompact } from "@/lib/ui/form-classes";

import { sortChoices } from "./quiz-editor-utils";

type QuestionCardProps = {
  question: QuizQuestion;
  qIndex: number;
  readOnly: boolean;
  onDeleteQuestion: (questionId: string) => void;
  onSavePrompt: (questionId: string, prompt: string) => void;
  onSaveChoiceText: (questionId: string, choiceId: string, text: string) => void;
  onMarkCorrect: (questionId: string, choiceId: string) => void;
  onDeleteChoice: (questionId: string, choiceId: string) => void;
  onAddChoice: (questionId: string) => void;
};

export function QuestionCard({
  question,
  qIndex,
  readOnly,
  onDeleteQuestion,
  onSavePrompt,
  onSaveChoiceText,
  onMarkCorrect,
  onDeleteChoice,
  onAddChoice,
}: QuestionCardProps) {
  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#2a9d8f]">Frage {qIndex + 1}</p>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => onDeleteQuestion(question.id)}
            className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
            aria-label="Frage löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <label className="mb-1 block text-xs font-medium text-[#777777] dark:text-zinc-400">
        Fragetext
      </label>
      <textarea
        defaultValue={question.prompt}
        disabled={readOnly}
        rows={3}
        className={`${inputClassCompact} mb-4 resize-y`}
        onBlur={(e) => onSavePrompt(question.id, e.target.value)}
      />

      <p className="mb-2 text-xs font-medium text-[#777777] dark:text-zinc-400">
        Antworten (eine als richtig markieren)
      </p>
      <ul className="space-y-2">
        {sortChoices(question).map((choice) => (
          <li key={choice.id} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={choice.is_correct}
              disabled={readOnly}
              onChange={() => onMarkCorrect(question.id, choice.id)}
              className="h-4 w-4 accent-[#2a9d8f]"
              aria-label="Richtige Antwort"
            />
            <input
              type="text"
              defaultValue={choice.text}
              disabled={readOnly}
              className={`${inputClassCompact} flex-1`}
              onBlur={(e) => onSaveChoiceText(question.id, choice.id, e.target.value)}
            />
            {!readOnly && question.choices.length > MIN_CHOICES ? (
              <button
                type="button"
                onClick={() => onDeleteChoice(question.id, choice.id)}
                className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                aria-label="Antwort löschen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {!readOnly && question.choices.length < MAX_CHOICES ? (
        <button
          type="button"
          onClick={() => onAddChoice(question.id)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          <Plus className="h-4 w-4" />
          Antwort hinzufügen
        </button>
      ) : null}
    </div>
  );
}

