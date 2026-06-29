export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 30;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 6;

/** Pro Schwierigkeitsstufe im Klausur-Pool (exam) */
export const MIN_POOL_PER_DIFFICULTY = 0;
export const MAX_POOL_PER_DIFFICULTY = 30;
export const MIN_POOL_TOTAL = 3;
export const MAX_POOL_TOTAL = 90;

/** Klausur-Zeitlimit in Sekunden */
export const MIN_EXAM_DURATION_SECONDS = 300;
export const MAX_EXAM_DURATION_SECONDS = 7200;

export function quizStatusLabelDe(status: string): string {
  switch (status) {
    case "generating":
      return "Wird erstellt…";
    case "draft":
      return "Entwurf";
    case "published":
      return "Veröffentlicht";
    case "failed":
      return "Fehlgeschlagen";
    default:
      return status;
  }
}

export function difficultyLabelDe(d: string): string {
  switch (d) {
    case "easy":
      return "Leicht";
    case "medium":
      return "Mittel";
    case "hard":
      return "Schwer";
    default:
      return d;
  }
}

export function quizTypeLabelDe(type: string | undefined): string {
  switch (type) {
    case "exam":
      return "Klausur";
    case "live":
    default:
      return "Live-Quiz";
  }
}
