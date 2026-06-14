import { describe, expect, it } from "vitest";

import {
  canViewCourseMembers,
  isValidCourseId,
  memberStatusLabelDe,
  mergeMembersAndInvitations,
  parseRegisteredMember,
} from "@/lib/server/course-members";

const TEACHER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEACHER = "22222222-2222-4222-8222-222222222222";
const COURSE_ID = "33333333-3333-4333-8333-333333333333";

describe("isValidCourseId", () => {
  it("accepts valid UUID v4", () => {
    expect(isValidCourseId(COURSE_ID)).toBe(true);
    expect(isValidCourseId("  " + COURSE_ID + "  ")).toBe(true);
  });

  it("rejects invalid ids", () => {
    expect(isValidCourseId("")).toBe(false);
    expect(isValidCourseId("not-a-uuid")).toBe(false);
    expect(isValidCourseId("123")).toBe(false);
  });
});

describe("canViewCourseMembers", () => {
  it("allows admin for any course", () => {
    expect(canViewCourseMembers("admin", TEACHER_ID, OTHER_TEACHER)).toBe(true);
  });

  it("allows course owner teacher", () => {
    expect(canViewCourseMembers("teacher", TEACHER_ID, TEACHER_ID)).toBe(true);
  });

  it("denies other teachers", () => {
    expect(canViewCourseMembers("teacher", TEACHER_ID, OTHER_TEACHER)).toBe(false);
  });

  it("denies students", () => {
    expect(canViewCourseMembers("student", TEACHER_ID, TEACHER_ID)).toBe(false);
  });
});

describe("mergeMembersAndInvitations", () => {
  it("merges registered and pending without duplicates", () => {
    const result = mergeMembersAndInvitations(
      [
        {
          student_id: "s1",
          email: "registered@school.de",
          joined_at: "2026-01-01T00:00:00Z",
        },
      ],
      [
        { email: "pending@school.de", created_at: "2026-01-02T00:00:00Z" },
        { email: "Registered@School.de", created_at: "2026-01-03T00:00:00Z" },
      ],
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.email).toBe("pending@school.de");
    expect(result[1]?.email).toBe("registered@school.de");
    expect(result[1]?.status).toBe("registered");
    expect(result.find((m) => m.email === "registered@school.de")?.student_id).toBe("s1");
  });

  it("returns empty list when no data", () => {
    expect(mergeMembersAndInvitations([], [])).toEqual([]);
  });

  it("includes only pending when no registrations", () => {
    const result = mergeMembersAndInvitations(
      [],
      [{ email: "a@b.de", created_at: "2026-01-01T00:00:00Z" }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      email: "a@b.de",
      status: "pending",
      student_id: null,
      joined_at: null,
    });
  });

  it("sorts emails alphabetically", () => {
    const result = mergeMembersAndInvitations(
      [
        { student_id: "s2", email: "z@school.de", joined_at: "2026-01-01T00:00:00Z" },
        { student_id: "s1", email: "a@school.de", joined_at: "2026-01-01T00:00:00Z" },
      ],
      [],
    );
    expect(result.map((m) => m.email)).toEqual(["a@school.de", "z@school.de"]);
  });
});

describe("parseRegisteredMember", () => {
  it("parses nested profiles email", () => {
    const row = parseRegisteredMember({
      student_id: "s1",
      joined_at: "2026-01-01T00:00:00Z",
      profiles: { email: "student@school.de" },
    });
    expect(row).toEqual({
      student_id: "s1",
      email: "student@school.de",
      joined_at: "2026-01-01T00:00:00Z",
    });
  });

  it("parses flat email fallback", () => {
    const row = parseRegisteredMember({
      student_id: "s1",
      joined_at: "2026-01-01T00:00:00Z",
      email: "flat@school.de",
    });
    expect(row?.email).toBe("flat@school.de");
  });

  it("returns null without email", () => {
    expect(
      parseRegisteredMember({ student_id: "s1", joined_at: "2026-01-01T00:00:00Z" }),
    ).toBeNull();
  });

  it("returns null for invalid rows", () => {
    expect(parseRegisteredMember(null)).toBeNull();
    expect(parseRegisteredMember({ student_id: "s1" })).toBeNull();
  });
});

describe("memberStatusLabelDe", () => {
  it("returns German labels", () => {
    expect(memberStatusLabelDe("registered")).toBe("Registriert");
    expect(memberStatusLabelDe("pending")).toBe("Einladung offen");
  });
});
