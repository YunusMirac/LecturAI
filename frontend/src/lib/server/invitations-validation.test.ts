import { describe, expect, it } from "vitest";

import {
  canCreateCourse,
  validateCreateCourseBody,
  validateInvitationRequest,
} from "@/lib/server/invitations-validation";

describe("validateInvitationRequest", () => {
  it("allows admin to invite teacher", () => {
    const result = validateInvitationRequest(
      { email: "t@school.de", role: "teacher" },
      "admin",
    );
    expect(result).toEqual({
      email: "t@school.de",
      role: "teacher",
      courseId: null,
    });
  });

  it("forbids teacher inviting teacher", () => {
    const result = validateInvitationRequest(
      { email: "t@school.de", role: "teacher" },
      "teacher",
    );
    expect("status" in result && result.status).toBe(403);
  });

  it("forbids teacher invite with course_id", () => {
    const result = validateInvitationRequest(
      { email: "t@school.de", role: "teacher", course_id: "c1" },
      "admin",
    );
    expect("status" in result && result.status).toBe(400);
  });

  it("allows teacher to invite student with course", () => {
    const result = validateInvitationRequest(
      { email: "s@school.de", role: "student", course_id: "course-1" },
      "teacher",
    );
    expect(result).toEqual({
      email: "s@school.de",
      role: "student",
      courseId: "course-1",
    });
  });

  it("forbids admin inviting student", () => {
    const result = validateInvitationRequest(
      { email: "s@school.de", role: "student", course_id: "c1" },
      "admin",
    );
    expect("status" in result && result.status).toBe(403);
  });

  it("requires course_id for student invite", () => {
    const result = validateInvitationRequest(
      { email: "s@school.de", role: "student" },
      "teacher",
    );
    expect("status" in result && result.status).toBe(400);
  });

  it("rejects invalid email", () => {
    const result = validateInvitationRequest({ email: "bad", role: "teacher" }, "admin");
    expect("status" in result && result.status).toBe(400);
  });

  it("rejects invalid role", () => {
    const result = validateInvitationRequest(
      { email: "a@b.de", role: "admin" as "teacher" },
      "admin",
    );
    expect("status" in result && result.status).toBe(400);
  });
});

describe("validateCreateCourseBody", () => {
  it("accepts name and semester", () => {
    expect(validateCreateCourseBody({ name: " Analysis ", semester: " WS25 " })).toEqual({
      ok: true,
      name: "Analysis",
      semester: "WS25",
    });
  });

  it("rejects empty name", () => {
    expect("status" in validateCreateCourseBody({ name: "  " })).toBe(true);
  });

  it("normalizes empty semester to null", () => {
    const result = validateCreateCourseBody({ name: "Kurs", semester: "  " });
    expect(result).toEqual({ ok: true, name: "Kurs", semester: null });
  });
});

describe("canCreateCourse", () => {
  it("allows teacher and admin", () => {
    expect(canCreateCourse("teacher")).toBe(true);
    expect(canCreateCourse("admin")).toBe(true);
  });

  it("denies student", () => {
    expect(canCreateCourse("student")).toBe(false);
  });
});
