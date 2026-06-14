import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/invitations/route";
import { COURSE_ID, TEACHER_ID } from "@/lib/server/quiz-fixtures";

const mockGetAuthenticatedProfile = vi.fn();
const mockFindProfileByEmail = vi.fn();
const mockIsCourseMember = vi.fn();
const mockAddStudentToCourse = vi.fn();
const mockAcceptPendingInvitationsForCourse = vi.fn();
const mockSendCourseAddedEmail = vi.fn();
const mockSendInvitationEmail = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/server/api-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/api-helpers")>();
  return {
    ...actual,
    getAuthenticatedProfile: (...args: unknown[]) => mockGetAuthenticatedProfile(...args),
    sendCourseAddedEmail: (...args: unknown[]) => mockSendCourseAddedEmail(...args),
    sendInvitationEmail: (...args: unknown[]) => mockSendInvitationEmail(...args),
    createAdminClient: () => ({ from: mockAdminFrom }),
  };
});

vi.mock("@/lib/server/student-course-enrollment", () => ({
  findProfileByEmail: (...args: unknown[]) => mockFindProfileByEmail(...args),
  isCourseMember: (...args: unknown[]) => mockIsCourseMember(...args),
  addStudentToCourse: (...args: unknown[]) => mockAddStudentToCourse(...args),
  acceptPendingInvitationsForCourse: (...args: unknown[]) =>
    mockAcceptPendingInvitationsForCourse(...args),
  canInviteEmailAsStudent: (profile: { role: string }) => profile.role === "student",
}));

function courseChain(course: { id: string; name: string; teacher_id: string } | null) {
  const c: Record<string, unknown> = {};
  c.eq = () => c;
  c.select = () => c;
  c.maybeSingle = () => Promise.resolve({ data: course });
  return c;
}

function inviteInsertChain(row: Record<string, unknown>) {
  const c: Record<string, unknown> = {};
  c.select = () => c;
  c.single = () => Promise.resolve({ data: row, error: null });
  return c;
}

describe("POST /api/invitations", () => {
  beforeEach(() => {
    mockGetAuthenticatedProfile.mockReset();
    mockFindProfileByEmail.mockReset();
    mockIsCourseMember.mockReset();
    mockAddStudentToCourse.mockReset();
    mockAcceptPendingInvitationsForCourse.mockReset();
    mockSendCourseAddedEmail.mockReset();
    mockSendInvitationEmail.mockReset();
    mockAdminFrom.mockReset();

    mockGetAuthenticatedProfile.mockResolvedValue({
      profile: { id: TEACHER_ID, role: "teacher", email: "t@school.de" },
    });
    mockSendCourseAddedEmail.mockResolvedValue(true);
    mockSendInvitationEmail.mockResolvedValue(true);
  });

  it("adds existing student directly without registration invite", async () => {
    mockFindProfileByEmail.mockResolvedValue({
      id: "student-1",
      email: "s@test.de",
      role: "student",
    });
    mockIsCourseMember.mockResolvedValue(false);
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        return courseChain({ id: COURSE_ID, name: "Analysis I", teacher_id: TEACHER_ID });
      }
      throw new Error(`unexpected ${table}`);
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          email: "s@test.de",
          role: "student",
          course_id: COURSE_ID,
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.added_directly).toBe(true);
    expect(body.register_url).toBeUndefined();
    expect(mockAddStudentToCourse).toHaveBeenCalled();
    expect(mockSendCourseAddedEmail).toHaveBeenCalled();
    expect(mockSendInvitationEmail).not.toHaveBeenCalled();
  });

  it("creates registration invite for new email", async () => {
    mockFindProfileByEmail.mockResolvedValue(null);
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        return courseChain({ id: COURSE_ID, name: "Analysis I", teacher_id: TEACHER_ID });
      }
      if (table === "invitations") {
        return {
          insert: () =>
            inviteInsertChain({
              id: "inv-1",
              email: "new@test.de",
              role: "student",
              course_id: COURSE_ID,
              status: "pending",
            }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          email: "new@test.de",
          role: "student",
          course_id: COURSE_ID,
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.added_directly).toBe(false);
    expect(body.register_url).toBeDefined();
    expect(mockSendInvitationEmail).toHaveBeenCalled();
  });

  it("returns 409 when student already in course", async () => {
    mockFindProfileByEmail.mockResolvedValue({
      id: "student-1",
      email: "s@test.de",
      role: "student",
    });
    mockIsCourseMember.mockResolvedValue(true);
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        return courseChain({ id: COURSE_ID, name: "Analysis I", teacher_id: TEACHER_ID });
      }
      throw new Error(`unexpected ${table}`);
    });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          email: "s@test.de",
          role: "student",
          course_id: COURSE_ID,
        }),
      }),
    );

    expect(res.status).toBe(409);
    expect(mockAddStudentToCourse).not.toHaveBeenCalled();
  });
});
