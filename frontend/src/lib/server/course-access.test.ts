import { describe, expect, it } from "vitest";

import {
  buildRemoveMemberResult,
  canManageCourse,
  isValidCourseId,
  removeMemberDetailMessage,
  validateRemoveMemberBody,
  validateUpdateCourseBody,
} from "@/lib/server/course-access";

const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEACHER = "22222222-2222-4222-8222-222222222222";
const COURSE_ID = "33333333-3333-4333-8333-333333333333";

describe("isValidCourseId", () => {
  it("accepts valid UUID", () => {
    expect(isValidCourseId(COURSE_ID)).toBe(true);
  });

  it("rejects invalid ids", () => {
    expect(isValidCourseId("invalid")).toBe(false);
  });
});

describe("canManageCourse", () => {
  it("allows admin", () => {
    expect(canManageCourse("admin", TEACHER_ID, OTHER_TEACHER)).toBe(true);
  });

  it("allows course owner", () => {
    expect(canManageCourse("teacher", TEACHER_ID, TEACHER_ID)).toBe(true);
  });

  it("denies other teachers and students", () => {
    expect(canManageCourse("teacher", TEACHER_ID, OTHER_TEACHER)).toBe(false);
    expect(canManageCourse("student", TEACHER_ID, TEACHER_ID)).toBe(false);
  });
});

describe("validateUpdateCourseBody", () => {
  it("accepts valid name", () => {
    const r = validateUpdateCourseBody({ name: " Analysis ", semester: " WS " });
    expect(r).toMatchObject({ ok: true, name: "Analysis", semester: "WS" });
  });

  it("rejects empty name", () => {
    const r = validateUpdateCourseBody({ name: "  " });
    expect(r).toMatchObject({ status: 400 });
  });
});

describe("validateRemoveMemberBody", () => {
  it("normalizes email", () => {
    const r = validateRemoveMemberBody({ email: " Student@School.de " });
    expect(r).toMatchObject({ ok: true, email: "student@school.de" });
  });

  it("rejects invalid email", () => {
    const r = validateRemoveMemberBody({ email: "not-email" });
    expect(r).toMatchObject({ status: 400 });
  });
});

describe("buildRemoveMemberResult", () => {
  it("returns null when nothing changed", () => {
    expect(buildRemoveMemberResult(false, false)).toBeNull();
  });

  it("returns flags when something changed", () => {
    expect(buildRemoveMemberResult(true, false)).toEqual({
      removed_membership: true,
      revoked_invitation: false,
    });
  });
});

describe("removeMemberDetailMessage", () => {
  it("describes membership removal with account hint", () => {
    expect(
      removeMemberDetailMessage({ removed_membership: true, revoked_invitation: false }),
    ).toContain("Login-Konto bleibt bestehen");
  });
});
