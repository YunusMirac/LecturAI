import type { ReactNode } from "react";

import type { QuizDifficulty } from "@/lib/quiz/domain";
import { difficultyLabelDe } from "@/lib/quiz-labels";
import { EXAM_DIFFICULTY_ORDER } from "@/lib/quiz/domain";

type ExamDifficultySectionsProps = {
  renderSection: (level: QuizDifficulty) => ReactNode;
};

export function ExamDifficultySections({ renderSection }: ExamDifficultySectionsProps) {
  return (
    <div className="space-y-10">
      {EXAM_DIFFICULTY_ORDER.map((level) => (
        <section key={level} className="space-y-4">
          <h2 className="text-lg font-bold text-[#333333] dark:text-zinc-100">
            {difficultyLabelDe(level)}
          </h2>
          {renderSection(level)}
        </section>
      ))}
    </div>
  );
}
