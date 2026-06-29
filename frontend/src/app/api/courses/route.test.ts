import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/courses/route";
import { COURSE_ID, TEACHER_ID, STUDENT_ID } from "@/lib/server/quiz-fixtures";

const mockGetAuthenticatedProfile = vi.fn();

const mockCoursesOrder = vi.fn();
const mockMembersEq = vi.fn();
const mockCoursesIn = vi.fn();
const mockCoursesInsert = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "courses") {
        return {
          select: () => ({
            order: mockCoursesOrder,
            eq: () => ({ order: mockCoursesOrder }),
            in: () => ({ order: mockCoursesOrder }),
          }),
          insert: () => mockCoursesInsert(),
        };
      }
      if (table === "course_members") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ order: mockMembersEq }) }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

const adminProfile = { id: "admin-id", email: "a@school.de", role: "admin" as const };
const teacherProfile = { id: TEACHER_ID, email: "t@school.de", role: "teacher" as const };
const studentProfile = { id: STUDENT_ID, email: "s@school.de", role: "student" as const };
const mockUser = { id: TEACHER_ID };
const mockStudentUser = { id: STUDENT_ID };

const sampleCourse = {
  id: COURSE_ID,
  name: "Informatik 1",
  semester: "WS 2025",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("GET /api/courses", () => {
  const req = new Request("http://localhost/api/courses");

  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockCoursesOrder.mockReset();
    mockMembersEq.mockReset();
    mockCoursesIn.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(JSON.stringify({ detail: "Nicht angemeldet." }), { status: 401 }),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns all courses for admin", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockUser, profile: adminProfile });
    mockCoursesOrder.mockResolvedValue({ data: [sampleCourse], error: null });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it("returns 500 on admin DB error", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockUser, profile: adminProfile });
    mockCoursesOrder.mockResolvedValue({ data: null, error: { message: "err" } });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("returns teacher-owned courses for teacher", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockUser, profile: teacherProfile });
    mockCoursesOrder.mockResolvedValue({ data: [sampleCourse], error: null });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("returns empty array for student not enrolled in any course", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      user: mockStudentUser,
      profile: studentProfile,
    });
    mockMembersEq.mockResolvedValue({ data: [], error: null });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/courses", () => {
  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockCoursesInsert.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({
      error: new Response(null, { status: 401 }),
    });
    const req = new Request("http://localhost/api/courses", {
      method: "POST",
      body: JSON.stringify({ name: "Kurs", semester: null }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for student trying to create a course", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockStudentUser, profile: studentProfile });
    const req = new Request("http://localhost/api/courses", {
      method: "POST",
      body: JSON.stringify({ name: "Kurs", semester: null }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockUser, profile: teacherProfile });
    const req = new Request("http://localhost/api/courses", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing course name", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockUser, profile: teacherProfile });
    const req = new Request("http://localhost/api/courses", {
      method: "POST",
      body: JSON.stringify({ semester: "WS 2025" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates course and returns 201 for teacher", async () => {
    mockGetAuthenticatedProfile.mockResolvedValue({ user: mockUser, profile: teacherProfile });
    mockCoursesInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { ...sampleCourse, teacher_id: TEACHER_ID },
            error: null,
          }),
      }),
    });
    const req = new Request("http://localhost/api/courses", {
      method: "POST",
      body: JSON.stringify({ name: "Informatik 1", semester: "WS 2025" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Informatik 1");
  });
});
