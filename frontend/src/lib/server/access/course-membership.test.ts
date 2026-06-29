import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadCourseMembership } from "@/lib/server/access/course-membership";
import { COURSE_ID, TEACHER_ID, STUDENT_ID } from "@/lib/server/quiz-fixtures";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const mockCourseMaybeSingle = vi.fn();
const mockMembersMaybeSingle = vi.fn();
const mockCreateAdminClient = vi.fn();

vi.mock("@/lib/server/api-helpers", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === "courses") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: mockCourseMaybeSingle }) }),
        };
      }
      if (table === "course_members") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: mockMembersMaybeSingle }) }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe("loadCourseMembership", () => {
  beforeEach(() => {
    mockCourseMaybeSingle.mockReset();
    mockMembersMaybeSingle.mockReset();
    mockCreateAdminClient.mockReset();
    mockCreateAdminClient.mockImplementation(makeAdminClient);
  });

  it("returns null for invalid course ID", async () => {
    const result = await loadCourseMembership("not-a-uuid", TEACHER_ID, "teacher");
    expect(result).toBeNull();
    expect(mockCourseMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns null when admin client throws", async () => {
    mockCreateAdminClient.mockImplementationOnce(() => {
      throw new Error("no service role key");
    });
    const result = await loadCourseMembership(COURSE_ID, TEACHER_ID, "teacher");
    expect(result).toBeNull();
  });

  it("returns null when course not found in DB", async () => {
    mockCourseMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await loadCourseMembership(COURSE_ID, TEACHER_ID, "teacher");
    expect(result).toBeNull();
  });

  it("returns null when course DB query errors", async () => {
    mockCourseMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    });
    const result = await loadCourseMembership(COURSE_ID, TEACHER_ID, "teacher");
    expect(result).toBeNull();
  });

  it("returns canManage:true for admin regardless of ownership", async () => {
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID },
      error: null,
    });
    const result = await loadCourseMembership(COURSE_ID, ADMIN_ID, "admin");
    expect(result).toEqual({ canManage: true });
    expect(mockMembersMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns canManage:true for teacher who owns the course", async () => {
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID },
      error: null,
    });
    const result = await loadCourseMembership(COURSE_ID, TEACHER_ID, "teacher");
    expect(result).toEqual({ canManage: true });
    expect(mockMembersMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns null for teacher who does not own the course and is not a member", async () => {
    const OTHER_TEACHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID },
      error: null,
    });
    mockMembersMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await loadCourseMembership(COURSE_ID, OTHER_TEACHER, "teacher");
    expect(result).toBeNull();
  });

  it("returns canManage:false for enrolled student", async () => {
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID },
      error: null,
    });
    mockMembersMaybeSingle.mockResolvedValue({
      data: { student_id: STUDENT_ID },
      error: null,
    });
    const result = await loadCourseMembership(COURSE_ID, STUDENT_ID, "student");
    expect(result).toEqual({ canManage: false });
  });

  it("returns null for student not enrolled in the course", async () => {
    mockCourseMaybeSingle.mockResolvedValue({
      data: { id: COURSE_ID, teacher_id: TEACHER_ID },
      error: null,
    });
    mockMembersMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await loadCourseMembership(COURSE_ID, STUDENT_ID, "student");
    expect(result).toBeNull();
  });
});
