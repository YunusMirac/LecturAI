import type { QuizSummary } from "@/lib/api/quizzesApi";

/** Schüler:innen sehen Live-Quizze nur bei live_open, Klausuren nur bei exam_open. */
export function isQuizVisibleToStudent(quiz: QuizSummary): boolean {
  if (quiz.status !== "published") return false;
  if (quiz.quiz_type === "exam") return quiz.exam_open === true;
  return quiz.live_open === true;
}

export function filterQuizzesForStudentView(quizzes: QuizSummary[]): QuizSummary[] {
  return quizzes.filter(isQuizVisibleToStudent);
}

export function filterQuizzesForCourseViewer(
  quizzes: QuizSummary[],
  canManageCourse: boolean,
): QuizSummary[] {
  if (canManageCourse) return quizzes;
  return filterQuizzesForStudentView(quizzes);
}

export function studentQuizHref(
  courseId: string,
  quiz: QuizSummary,
): string {
  return `/dashboard/courses/${courseId}/quizzes/${quiz.id}/join`;
}
