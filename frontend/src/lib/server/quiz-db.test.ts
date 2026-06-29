import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPdfStoragePath,
  countQuestionsByDifficulty,
  defaultQuizTitle,
  insertGeneratedQuestions,
  loadQuizDetail,
  parseSettingsFromRow,
} from "@/lib/server/quiz-db";
import type { QuizRow } from "@/lib/server/quiz-types";
import {
  COURSE_ID,
  QUIZ_ID,
  baseSettings,
  makeGeneratedPayload,
  makePoolQuestions,
  poolSettings,
} from "@/lib/server/quiz-fixtures";

const mockQuizMaybeSingle = vi.fn();
const mockQuestionsOrder = vi.fn();
const mockChoicesOrder = vi.fn();
const mockQuestionInsert = vi.fn();
const mockChoiceInsert = vi.fn();

function createMockAdmin() {
  return {
    from: (table: string) => {
      if (table === "quizzes") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockQuizMaybeSingle,
            }),
          }),
        };
      }
      if (table === "quiz_questions") {
        return {
          select: () => ({
            eq: () => ({
              order: mockQuestionsOrder,
            }),
          }),
          insert: mockQuestionInsert,
        };
      }
      if (table === "quiz_choices") {
        return {
          select: () => ({
            eq: () => ({
              order: mockChoicesOrder,
            }),
          }),
          insert: mockChoiceInsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("buildPdfStoragePath", () => {
  it("builds course/quiz scoped storage path", () => {
    expect(buildPdfStoragePath(COURSE_ID, QUIZ_ID)).toBe(
      `${COURSE_ID}/${QUIZ_ID}/source.pdf`,
    );
  });
});

describe("defaultQuizTitle", () => {
  it("includes course name and German date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(defaultQuizTitle("Analysis I")).toBe("Quiz — Analysis I — 1.6.2026");
    vi.useRealTimers();
  });
});

describe("parseSettingsFromRow", () => {
  it("parses settings_json from row", () => {
    const row = {
      settings_json: baseSettings,
    } as QuizRow;
    expect(parseSettingsFromRow(row)).toEqual(baseSettings);
  });

  it("falls back to defaults when settings invalid", () => {
    const row = { settings_json: { bad: true } } as unknown as QuizRow;
    expect(parseSettingsFromRow(row)).toEqual({
      question_count: 5,
      choice_count: 4,
      difficulty: "medium",
    });
  });

  it("parses pool settings from row", () => {
    const row = { settings_json: poolSettings } as QuizRow;
    expect(parseSettingsFromRow(row)).toEqual(poolSettings);
  });
});

describe("countQuestionsByDifficulty", () => {
  it("aggregates questions by difficulty", () => {
    const counts = countQuestionsByDifficulty(makePoolQuestions({ easy: 2, medium: 3, hard: 1 }));
    expect(counts).toEqual({ easy: 2, medium: 3, hard: 1 });
  });
});

describe("loadQuizDetail", () => {
  beforeEach(() => {
    mockQuizMaybeSingle.mockReset();
    mockQuestionsOrder.mockReset();
    mockChoicesOrder.mockReset();
  });

  it("returns null when quiz missing", async () => {
    mockQuizMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await loadQuizDetail(createMockAdmin() as never, QUIZ_ID);
    expect(result).toBeNull();
  });

  it("loads quiz with nested questions and choices", async () => {
    mockQuizMaybeSingle.mockResolvedValue({
      data: {
        id: QUIZ_ID,
        course_id: COURSE_ID,
        title: "Test-Quiz",
        status: "draft",
        settings_json: baseSettings,
        source_pdf_path: `${COURSE_ID}/${QUIZ_ID}/source.pdf`,
        generation_error: null,
        created_by: "teacher",
        published_at: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      error: null,
    });
    mockQuestionsOrder.mockResolvedValue({
      data: [
        {
          id: "q1",
          quiz_id: QUIZ_ID,
          prompt: "Frage 1?",
          sort_order: 0,
          created_at: "2026-01-01",
        },
      ],
    });
    mockChoicesOrder.mockResolvedValue({
      data: [
        { id: "c1", question_id: "q1", text: "Ja", is_correct: true, sort_order: 0 },
        { id: "c2", question_id: "q1", text: "Nein", is_correct: false, sort_order: 1 },
      ],
    });

    const result = await loadQuizDetail(createMockAdmin() as never, QUIZ_ID);
    expect(result?.title).toBe("Test-Quiz");
    expect(result?.questions).toHaveLength(1);
    expect(result?.questions[0]?.choices).toHaveLength(2);
    expect(result?.settings_json).toEqual(baseSettings);
  });
});

describe("insertGeneratedQuestions", () => {
  beforeEach(() => {
    mockQuestionInsert.mockReset();
    mockChoiceInsert.mockReset();
  });

  it("inserts questions and choices in order", async () => {
    mockQuestionInsert.mockImplementation(() => ({
      select: () => ({
        single: vi.fn().mockResolvedValue({
          data: { id: "new-q" },
          error: null,
        }),
      }),
    }));
    mockChoiceInsert.mockResolvedValue({ error: null });

    const payload = makeGeneratedPayload(2, 3);
    await insertGeneratedQuestions(createMockAdmin() as never, QUIZ_ID, payload);

    expect(mockQuestionInsert).toHaveBeenCalledTimes(2);
    expect(mockChoiceInsert).toHaveBeenCalledTimes(2);
    expect(mockQuestionInsert.mock.calls[0]?.[0]).toMatchObject({
      quiz_id: QUIZ_ID,
      prompt: "Frage 1?",
      sort_order: 0,
      difficulty: "medium",
    });
  });

  it("stores difficulty from generated payload", async () => {
    mockQuestionInsert.mockImplementation(() => ({
      select: () => ({
        single: vi.fn().mockResolvedValue({
          data: { id: "new-q" },
          error: null,
        }),
      }),
    }));
    mockChoiceInsert.mockResolvedValue({ error: null });

    const payload = {
      questions: [
        {
          prompt: "Leicht?",
          difficulty: "easy" as const,
          choices: makeGeneratedPayload(1, 2).questions[0]!.choices,
        },
      ],
    };
    await insertGeneratedQuestions(createMockAdmin() as never, QUIZ_ID, payload);
    expect(mockQuestionInsert.mock.calls[0]?.[0]).toMatchObject({ difficulty: "easy" });
  });

  it("throws when question insert fails", async () => {
    mockQuestionInsert.mockImplementation(() => ({
      select: () => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB-Fehler" },
        }),
      }),
    }));

    await expect(
      insertGeneratedQuestions(
        createMockAdmin() as never,
        QUIZ_ID,
        makeGeneratedPayload(1, 2),
      ),
    ).rejects.toThrow("DB-Fehler");
  });
});
