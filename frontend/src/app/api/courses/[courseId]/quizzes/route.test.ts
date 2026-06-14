import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/courses/[courseId]/quizzes/route";
import { COURSE_ID, QUIZ_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";

const mockRequireCourseAccess = vi.fn();
const mockRequireManagedCourse = vi.fn();
const mockQuizzesOrder = vi.fn();
const mockQuizzesEq = vi.fn();
const mockQuizInsertSingle = vi.fn();
const mockQuizDeleteEq = vi.fn();
const mockQuizUpdateEq = vi.fn();
const mockStorageUpload = vi.fn();
const mockRunJob = vi.fn();

vi.mock("@/lib/server/require-course-access", () => ({
  requireCourseAccess: (...args: unknown[]) => mockRequireCourseAccess(...args),
}));

vi.mock("@/lib/server/require-managed-course", () => ({
  requireManagedCourse: (...args: unknown[]) => mockRequireManagedCourse(...args),
}));

vi.mock("@/lib/server/quiz-generation", () => ({
  runQuizGenerationJob: (...args: unknown[]) => mockRunJob(...args),
}));

vi.mock("next/server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("next/server")>();
  return { ...orig, after: vi.fn() };
});

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "quizzes") {
        return {
          select: () => ({
            eq: (...args: unknown[]) => {
              mockQuizzesEq(...args);
              const chain = {
                eq: (...innerArgs: unknown[]) => {
                  mockQuizzesEq(...innerArgs);
                  return {
                    eq: (...thirdArgs: unknown[]) => {
                      mockQuizzesEq(...thirdArgs);
                      return { order: mockQuizzesOrder };
                    },
                    order: mockQuizzesOrder,
                  };
                },
                order: mockQuizzesOrder,
              };
              return chain;
            },
          }),
          insert: () => ({
            select: () => ({
              single: mockQuizInsertSingle,
            }),
          }),
          delete: () => ({ eq: mockQuizDeleteEq }),
          update: () => ({ eq: mockQuizUpdateEq }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    storage: {
      from: () => ({
        upload: mockStorageUpload,
      }),
    },
  }),
}));

async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}

function pdfFile(content = "%PDF", type = "application/pdf") {
  return new File([content], "lecture.pdf", { type });
}

describe("GET /api/courses/[courseId]/quizzes", () => {
  beforeEach(() => {
    mockRequireCourseAccess.mockReset();
    mockRequireManagedCourse.mockReset();
    mockQuizzesOrder.mockReset();
    mockQuizzesEq.mockReset();
  });

  it("returns auth error from requireCourseAccess", async () => {
    mockRequireCourseAccess.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
    });

    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: COURSE_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns quiz list for authorized teacher", async () => {
    mockRequireCourseAccess.mockResolvedValue({ ok: true, canManage: true });
    mockQuizzesOrder.mockResolvedValue({
      data: [{ id: QUIZ_ID, title: "Quiz 1", status: "draft" }],
      error: null,
    });

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), {
        params: Promise.resolve({ courseId: COURSE_ID }),
      }),
    );
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("filters to open live/exam quizzes for students", async () => {
    mockRequireCourseAccess.mockResolvedValue({ ok: true, canManage: false });
    mockQuizzesOrder.mockResolvedValue({
      data: [
        { id: QUIZ_ID, title: "Live", status: "published", live_open: true, quiz_type: "live" },
        { id: "q2", title: "Closed", status: "published", live_open: false, quiz_type: "live" },
        {
          id: "q3",
          title: "Exam",
          status: "published",
          exam_open: true,
          quiz_type: "exam",
        },
      ],
      error: null,
    });

    const { status, body } = await readJson(
      await GET(new Request("http://localhost"), {
        params: Promise.resolve({ courseId: COURSE_ID }),
      }),
    );
    expect(status).toBe(200);
    expect(mockQuizzesEq).toHaveBeenCalledWith("status", "published");
    expect(body).toHaveLength(2);
  });
});

describe("POST /api/courses/[courseId]/quizzes", () => {
  beforeEach(() => {
    mockRequireManagedCourse.mockReset();
    mockQuizInsertSingle.mockReset();
    mockQuizDeleteEq.mockReset();
    mockQuizUpdateEq.mockReset();
    mockStorageUpload.mockReset();
    mockRunJob.mockReset();
  });

  it("rejects missing PDF", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, name: "Analysis", teacher_id: TEACHER_ID },
      profile: { id: TEACHER_ID, role: "teacher" },
    });

    const form = new FormData();
    form.append("question_count", "5");
    form.append("choice_count", "4");
    form.append("difficulty", "medium");

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: form }),
        { params: Promise.resolve({ courseId: COURSE_ID }) },
      ),
    );
    expect(status).toBe(400);
    expect(body.pdf).toBeDefined();
  });

  it("rejects non-PDF mime type", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, name: "Analysis", teacher_id: TEACHER_ID },
      profile: { id: TEACHER_ID, role: "teacher" },
    });

    const form = new FormData();
    form.append("pdf", new File(["text"], "notes.txt", { type: "text/plain" }));
    form.append("question_count", "5");
    form.append("choice_count", "4");

    const { status } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: form }),
        { params: Promise.resolve({ courseId: COURSE_ID }) },
      ),
    );
    expect(status).toBe(400);
  });

  it("rejects invalid question count", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, name: "Analysis", teacher_id: TEACHER_ID },
      profile: { id: TEACHER_ID, role: "teacher" },
    });

    const form = new FormData();
    form.append("pdf", pdfFile());
    form.append("question_count", "1");
    form.append("choice_count", "4");

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: form }),
        { params: Promise.resolve({ courseId: COURSE_ID }) },
      ),
    );
    expect(status).toBe(400);
    expect(body.question_count).toBeDefined();
  });

  it("creates quiz and returns 202 with quiz_id", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, name: "Analysis", teacher_id: TEACHER_ID },
      profile: { id: TEACHER_ID, role: "teacher", email: "t@school.de" },
    });
    mockQuizInsertSingle.mockResolvedValue({ data: { id: QUIZ_ID }, error: null });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockQuizUpdateEq.mockResolvedValue({ error: null });

    const form = new FormData();
    form.append("pdf", pdfFile());
    form.append("question_count", "5");
    form.append("choice_count", "4");
    form.append("difficulty", "medium");
    form.append("title", "  Klausur Vorbereitung  ");

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: form }),
        { params: Promise.resolve({ courseId: COURSE_ID }) },
      ),
    );
    expect(status).toBe(202);
    expect(body.quiz_id).toBe(QUIZ_ID);
    expect(body.status).toBe("generating");
    expect(mockStorageUpload).toHaveBeenCalled();
  });

  it("rolls back quiz row when storage upload fails", async () => {
    mockRequireManagedCourse.mockResolvedValue({
      ok: true,
      course: { id: COURSE_ID, name: "Analysis", teacher_id: TEACHER_ID },
      profile: { id: TEACHER_ID, role: "teacher", email: "t@school.de" },
    });
    mockQuizInsertSingle.mockResolvedValue({ data: { id: QUIZ_ID }, error: null });
    mockStorageUpload.mockResolvedValue({ error: { message: "Upload failed" } });
    mockQuizDeleteEq.mockResolvedValue({ error: null });

    const form = new FormData();
    form.append("pdf", pdfFile());
    form.append("question_count", "5");
    form.append("choice_count", "4");

    const { status, body } = await readJson(
      await POST(
        new Request("http://localhost", { method: "POST", body: form }),
        { params: Promise.resolve({ courseId: COURSE_ID }) },
      ),
    );
    expect(status).toBe(500);
    expect(body.detail).toBe("Upload failed");
    expect(mockQuizDeleteEq).toHaveBeenCalled();
  });
});
