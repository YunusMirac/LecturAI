import { describe, expect, it } from "vitest";

import { parseCourseMembersPayload } from "@/lib/api/courseMembersApi";

describe("parseCourseMembersPayload", () => {
  const valid = {
    course_id: "33333333-3333-4333-8333-333333333333",
    course_name: "Analysis I",
    members: [
      {
        email: "a@school.de",
        status: "registered",
        student_id: "s1",
        joined_at: "2026-01-01T00:00:00Z",
        invited_at: null,
      },
      {
        email: "b@school.de",
        status: "pending",
        student_id: null,
        joined_at: null,
        invited_at: "2026-01-02T00:00:00Z",
      },
    ],
    counts: { registered: 1, pending: 1, total: 2 },
  };

  it("parses valid payload", () => {
    const result = parseCourseMembersPayload(valid);
    expect(result?.course_name).toBe("Analysis I");
    expect(result?.members).toHaveLength(2);
    expect(result?.counts.total).toBe(2);
  });

  it("rejects missing course_id", () => {
    expect(parseCourseMembersPayload({ ...valid, course_id: 123 })).toBeNull();
  });

  it("rejects invalid member status", () => {
    expect(
      parseCourseMembersPayload({
        ...valid,
        members: [{ email: "a@b.de", status: "unknown" }],
      }),
    ).toBeNull();
  });

  it("rejects invalid counts", () => {
    expect(
      parseCourseMembersPayload({
        ...valid,
        counts: { registered: 1, pending: "1", total: 2 },
      }),
    ).toBeNull();
  });

  it("rejects non-array members", () => {
    expect(parseCourseMembersPayload({ ...valid, members: {} })).toBeNull();
  });

  it("rejects null payload", () => {
    expect(parseCourseMembersPayload(null)).toBeNull();
  });
});
