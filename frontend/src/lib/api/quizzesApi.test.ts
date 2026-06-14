import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addChoice,
  addQuestion,
  createQuizFromPdf,
  deleteChoice,
  deleteQuestion,
  deleteQuiz,
  fetchCourseQuizzes,
  fetchQuizDetail,
  publishQuiz,
  updateChoice,
  updateQuestion,
} from "@/lib/api/quizzesApi";
import { COURSE_ID, QUIZ_ID, QUESTION_ID, CHOICE_ID } from "@/lib/server/quiz-fixtures";

const mockGetAccessToken = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/api/authApi", () => ({
  getAccessToken: () => mockGetAccessToken(),
}));

describe("quizzesApi", () => {
  beforeEach(() => {
    mockGetAccessToken.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns not logged in when token missing", async () => {
    mockGetAccessToken.mockResolvedValue(null);
    expect(await fetchCourseQuizzes(COURSE_ID)).toEqual({
      ok: false,
      message: "Nicht angemeldet.",
    });
  });

  it("fetchCourseQuizzes loads quiz list", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: QUIZ_ID, title: "Quiz", status: "draft" }],
    });

    const result = await fetchCourseQuizzes(COURSE_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.quizzes).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/courses/${COURSE_ID}/quizzes`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
  });

  it("createQuizFromPdf accepts 202 response", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 202,
      json: async () => ({ quiz_id: QUIZ_ID }),
    });

    const form = new FormData();
    const result = await createQuizFromPdf(COURSE_ID, form);
    expect(result).toEqual({ ok: true, quizId: QUIZ_ID });
  });

  it("createQuizFromPdf surfaces server errors", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "PDF fehlt" }),
    });

    const result = await createQuizFromPdf(COURSE_ID, new FormData());
    expect(result).toEqual({ ok: false, message: "PDF fehlt" });
  });

  it("fetchQuizDetail returns quiz on success", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: QUIZ_ID, status: "draft", questions: [] }),
    });

    const result = await fetchQuizDetail(QUIZ_ID);
    expect(result.ok).toBe(true);
  });

  it("publishQuiz returns detail message", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ detail: "Veröffentlicht.", status: "published" }),
    });

    const result = await publishQuiz(QUIZ_ID);
    expect(result).toEqual({ ok: true, detail: "Veröffentlicht." });
  });

  it("updateQuestion PATCHes prompt", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await updateQuestion(QUIZ_ID, QUESTION_ID, "Neuer Text");
    expect(result.ok).toBe(true);
    expect(mockFetch.mock.calls[0]?.[0]).toContain(`/questions/${QUESTION_ID}`);
  });

  it("deleteQuestion sends DELETE", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    expect(await deleteQuestion(QUIZ_ID, QUESTION_ID)).toEqual({ ok: true });
  });

  it("updateChoice PATCHes choice fields", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await updateChoice(QUIZ_ID, QUESTION_ID, CHOICE_ID, {
      is_correct: true,
    });
    expect(result.ok).toBe(true);
  });

  it("addQuestion POSTs payload", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await addQuestion(QUIZ_ID, {
      prompt: "Frage?",
      choices: [
        { text: "A", is_correct: true },
        { text: "B", is_correct: false },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("addChoice POSTs to choices endpoint", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const result = await addChoice(QUIZ_ID, QUESTION_ID, { text: "Neu" });
    expect(result.ok).toBe(true);
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain("/choices");
  });

  it("deleteChoice handles network errors", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockRejectedValue(new Error("offline"));

    const result = await deleteChoice(QUIZ_ID, QUESTION_ID, CHOICE_ID);
    expect(result).toEqual({ ok: false, message: "Netzwerkfehler." });
  });

  it("deleteQuiz sends DELETE and returns detail", async () => {
    mockGetAccessToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ detail: "Quiz gelöscht." }),
    });

    const result = await deleteQuiz(QUIZ_ID);
    expect(result).toEqual({ ok: true, detail: "Quiz gelöscht." });
    expect(mockFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });

  it("deleteQuiz returns unauthorized without token", async () => {
    mockGetAccessToken.mockResolvedValue(null);
    expect(await deleteQuiz(QUIZ_ID)).toEqual({ ok: false, message: "Nicht angemeldet." });
  });
});
