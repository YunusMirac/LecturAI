import type {
  AttemptQuestionSnapshot,
  DifficultyCounts,
  QuizDifficulty,
  QuizQuestionWithChoices,
} from "@/lib/server/quiz-types";

export type Rng = () => number;

function defaultRng(): Rng {
  return () => Math.random();
}

export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sampleFromArray<T>(items: T[], count: number, rng: Rng): T[] {
  if (count > items.length) {
    throw new Error(`Cannot sample ${count} items from pool of ${items.length}`);
  }
  if (count === 0) return [];
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

export function sampleQuestionsByDifficulty(
  questions: QuizQuestionWithChoices[],
  drawCounts: DifficultyCounts,
  rng: Rng = defaultRng(),
): { ok: true; questionIds: string[] } | { ok: false; message: string } {
  const byDifficulty: Record<QuizDifficulty, QuizQuestionWithChoices[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const q of questions) {
    const d = q.difficulty ?? "medium";
    if (d !== "easy" && d !== "medium" && d !== "hard") {
      return { ok: false, message: `Ungültige Schwierigkeit für Frage ${q.id}.` };
    }
    byDifficulty[d].push(q);
  }

  const selected: string[] = [];
  for (const level of ["easy", "medium", "hard"] as const) {
    const need = drawCounts[level];
    const pool = byDifficulty[level];
    if (need > pool.length) {
      return {
        ok: false,
        message: `Nicht genug ${level}-Fragen im Pool (${pool.length} verfügbar, ${need} benötigt).`,
      };
    }
    const picked = sampleFromArray(pool, need, rng);
    selected.push(...picked.map((q) => q.id));
  }

  return { ok: true, questionIds: selected };
}

export function shuffleQuestionIds(
  questionIds: string[],
  rng: Rng = defaultRng(),
): AttemptQuestionSnapshot[] {
  const shuffled = sampleFromArray(questionIds, questionIds.length, rng);
  return shuffled.map((question_id, sort_order) => ({ question_id, sort_order }));
}

export function buildStudentExamInstance(
  questions: QuizQuestionWithChoices[],
  drawCounts: DifficultyCounts,
  rng: Rng = defaultRng(),
): { ok: true; snapshot: AttemptQuestionSnapshot[] } | { ok: false; message: string } {
  const sampled = sampleQuestionsByDifficulty(questions, drawCounts, rng);
  if (!sampled.ok) return sampled;

  const snapshot = shuffleQuestionIds(sampled.questionIds, rng);
  return { ok: true, snapshot };
}

export function orderQuestionsBySnapshot(
  questions: QuizQuestionWithChoices[],
  snapshot: AttemptQuestionSnapshot[],
): QuizQuestionWithChoices[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return snapshot
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => byId.get(row.question_id))
    .filter((q): q is QuizQuestionWithChoices => q != null);
}

export function snapshotQuestionIds(snapshot: AttemptQuestionSnapshot[]): Set<string> {
  return new Set(snapshot.map((s) => s.question_id));
}

