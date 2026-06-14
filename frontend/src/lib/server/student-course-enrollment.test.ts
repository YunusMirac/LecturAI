import { describe, expect, it } from "vitest";

import { mergeMembersAndInvitations } from "@/lib/server/course-members";
import { canInviteEmailAsStudent } from "@/lib/server/student-course-enrollment";

describe("canInviteEmailAsStudent", () => {
  it("allows student profiles", () => {
    expect(canInviteEmailAsStudent({ id: "1", email: "s@test.de", role: "student" })).toBe(true);
  });

  it("rejects teacher profiles", () => {
    expect(canInviteEmailAsStudent({ id: "1", email: "t@test.de", role: "teacher" })).toBe(false);
  });

  it("rejects admin profiles", () => {
    expect(canInviteEmailAsStudent({ id: "1", email: "a@test.de", role: "admin" })).toBe(false);
  });
});

describe("mergeMembersAndInvitations", () => {
  it("prefers registered over pending for same email", () => {
    const merged = mergeMembersAndInvitations(
      [{ student_id: "s1", email: "s@test.de", joined_at: "2026-01-01T00:00:00Z" }],
      [{ email: "s@test.de", created_at: "2026-01-02T00:00:00Z" }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("registered");
  });
});
