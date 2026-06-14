import { describe, expect, it } from "vitest";

import type { QuizSummary } from "@/lib/api/quizzesApi";
import {
  filterQuizzesForStudentView,
  isQuizVisibleToStudent,
  studentQuizHref,
} from "@/lib/quiz-visibility";
import { QUIZ_ID } from "@/lib/server/quiz-fixtures";

function quiz(overrides: Partial<QuizSummary> = {}): QuizSummary {
  return {
    id: QUIZ_ID,
    course_id: "course-1",
    title: "Test",
    status: "published",
    quiz_type: "live",
    settings_json: { question_count: 5, choice_count: 4, difficulty: "medium" },
    generation_error: null,
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    live_open: false,
    exam_open: false,
    ...overrides,
  };
}

describe("isQuizVisibleToStudent", () => {
  it("shows live quiz when live_open", () => {
    expect(isQuizVisibleToStudent(quiz({ live_open: true }))).toBe(true);
  });

  it("shows exam when exam_open", () => {
    expect(
      isQuizVisibleToStudent(quiz({ quiz_type: "exam", exam_open: true, live_open: false })),
    ).toBe(true);
  });

  it("hides closed quizzes", () => {
    expect(isQuizVisibleToStudent(quiz({ live_open: false }))).toBe(false);
    expect(
      isQuizVisibleToStudent(quiz({ quiz_type: "exam", exam_open: false })),
    ).toBe(false);
  });
});

describe("filterQuizzesForStudentView", () => {
  it("includes both open live and exam", () => {
    const result = filterQuizzesForStudentView([
      quiz({ live_open: true }),
      quiz({ quiz_type: "exam", exam_open: true, live_open: false }),
      quiz({ live_open: false }),
    ]);
    expect(result).toHaveLength(2);
  });
});

describe("studentQuizHref", () => {
  it("routes to join page for live and exam", () => {
    expect(studentQuizHref("c1", quiz({ quiz_type: "exam" }))).toContain("/join");
    expect(studentQuizHref("c1", quiz({ quiz_type: "live" }))).toContain("/join");
  });
});
