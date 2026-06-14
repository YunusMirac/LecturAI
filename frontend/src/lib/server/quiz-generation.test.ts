import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateQuizFromPdf, runQuizGenerationJob } from "@/lib/server/quiz-generation";
import { baseSettings, makeGeneratedPayload, QUIZ_ID } from "@/lib/server/quiz-fixtures";

const mockGenerateContent = vi.fn();
const mockInsertGeneratedQuestions = vi.fn();
const mockDeleteEq = vi.fn();
const mockUpdateEq = vi.fn();
const mockDownload = vi.fn();
const mockResolveModels = vi.fn(() => ["gemini-2.5-flash"]);

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

vi.mock("@/lib/server/quiz-gemini", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/server/quiz-gemini")>();
  return {
    ...orig,
    resolveGeminiModelCandidates: () => mockResolveModels(),
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/server/quiz-db", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/server/quiz-db")>();
  return {
    ...orig,
    insertGeneratedQuestions: (...args: unknown[]) => mockInsertGeneratedQuestions(...args),
  };
});

describe("generateQuizFromPdf", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockResolveModels.mockReturnValue(["gemini-2.5-flash"]);
    mockGenerateContent.mockReset();
  });

  it("parses valid Gemini JSON response", async () => {
    const payload = makeGeneratedPayload(5, 4);
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(payload) },
    });

    const result = await generateQuizFromPdf(Buffer.from("%PDF"), baseSettings);
    expect(result.questions).toHaveLength(5);
    expect(mockGenerateContent).toHaveBeenCalledOnce();
  });

  it("throws when GEMINI_API_KEY missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateQuizFromPdf(Buffer.from("x"), baseSettings)).rejects.toThrow(
      "GEMINI_API_KEY fehlt",
    );
  });

  it("throws on invalid JSON from Gemini", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not-json" },
    });
    await expect(generateQuizFromPdf(Buffer.from("x"), baseSettings)).rejects.toThrow(
      "kein gültiges JSON",
    );
  });

  it("throws when payload fails validation", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ questions: [] }) },
    });
    await expect(generateQuizFromPdf(Buffer.from("x"), baseSettings)).rejects.toThrow(
      "Quiz-Format",
    );
  });

  it("falls back to next model when first is unavailable", async () => {
    mockResolveModels.mockReturnValue(["gemini-2.0-flash", "gemini-2.5-flash"]);
    const payload = makeGeneratedPayload(5, 4);
    mockGenerateContent
      .mockRejectedValueOnce(
        new Error("[429] limit: 0, model: gemini-2.0-flash FreeTier"),
      )
      .mockResolvedValueOnce({
        response: { text: () => JSON.stringify(payload) },
      });

    const result = await generateQuizFromPdf(Buffer.from("x"), baseSettings);
    expect(result.questions).toHaveLength(5);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });
});

describe("runQuizGenerationJob", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockGenerateContent.mockReset();
    mockInsertGeneratedQuestions.mockReset();
    mockDeleteEq.mockReset();
    mockUpdateEq.mockReset();
    mockDownload.mockReset();
    mockInsertGeneratedQuestions.mockResolvedValue(undefined);
  });

  function createJobAdmin() {
    return {
      storage: {
        from: () => ({
          download: mockDownload,
        }),
      },
      from: (table: string) => {
        if (table === "quiz_questions") {
          return { delete: () => ({ eq: mockDeleteEq }) };
        }
        if (table === "quizzes") {
          return {
            update: () => ({ eq: mockUpdateEq }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    };
  }

  it("marks quiz as draft on success", async () => {
    const payload = makeGeneratedPayload(5, 4);
    mockDownload.mockResolvedValue({
      data: new Blob([Buffer.from("%PDF")]),
      error: null,
    });
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(payload) },
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    await runQuizGenerationJob(createJobAdmin() as never, QUIZ_ID, "path/source.pdf", baseSettings);

    expect(mockInsertGeneratedQuestions).toHaveBeenCalledWith(
      expect.anything(),
      QUIZ_ID,
      payload,
    );
    expect(mockUpdateEq).toHaveBeenCalled();
  });

  it("marks quiz as failed with user-facing error on Gemini failure", async () => {
    mockDownload.mockResolvedValue({
      data: new Blob([Buffer.from("%PDF")]),
      error: null,
    });
    mockGenerateContent.mockRejectedValue(
      new Error("[429] limit: 0, model: gemini-2.0-flash FreeTier"),
    );
    mockUpdateEq.mockResolvedValue({ error: null });

    await runQuizGenerationJob(createJobAdmin() as never, QUIZ_ID, "path/source.pdf", baseSettings);

    expect(mockUpdateEq).toHaveBeenCalled();
    expect(mockInsertGeneratedQuestions).not.toHaveBeenCalled();
  });

  it("marks quiz failed when PDF download fails", async () => {
    mockDownload.mockResolvedValue({ data: null, error: { message: "Storage down" } });
    mockUpdateEq.mockResolvedValue({ error: null });

    await runQuizGenerationJob(createJobAdmin() as never, QUIZ_ID, "path/source.pdf", baseSettings);

    expect(mockInsertGeneratedQuestions).not.toHaveBeenCalled();
  });
});
