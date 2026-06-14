import { describe, expect, it } from "vitest";

import {
  assertExamOpenForStudent,
  assertJoinableExamQuiz,
  assertJoinableLiveQuiz,
  assertJoinableLiveStatus,
  assertLiveOpenForStudent,
  assertMatchingAccessCode,
  assertPublishedQuiz,
  joinAccessCodeError,
} from "@/lib/server/quiz-live-join";

const liveQuiz = {
  id: "q1",
  title: "T",
  course_id: "c1",
  status: "published",
  access_code: "ABC123",
  live_open: true,
  live_status: "lobby",
};

describe("joinAccessCodeError", () => {
  it("accepts valid codes", () => {
    expect(joinAccessCodeError("ABC1")).toBeNull();
  });

  it("rejects too short codes", () => {
    expect(joinAccessCodeError("AB")?.status).toBe(400);
  });
});

describe("assertPublishedQuiz", () => {
  it("allows published", () => {
    expect(assertPublishedQuiz({ status: "published" })).toBeNull();
  });

  it("blocks draft", () => {
    expect(assertPublishedQuiz({ status: "draft" })?.status).toBe(403);
  });
});

describe("assertLiveOpenForStudent", () => {
  it("allows when live open", () => {
    expect(assertLiveOpenForStudent({ live_open: true }, false)).toBeNull();
  });

  it("blocks closed for students", () => {
    expect(assertLiveOpenForStudent({ live_open: false }, false)?.status).toBe(403);
  });

  it("allows teachers regardless", () => {
    expect(assertLiveOpenForStudent({ live_open: false }, true)).toBeNull();
  });
});

describe("assertExamOpenForStudent", () => {
  it("blocks closed exam for students", () => {
    expect(assertExamOpenForStudent({ exam_open: false }, false)?.status).toBe(403);
  });
});

describe("assertMatchingAccessCode", () => {
  it("matches case-insensitively", () => {
    expect(assertMatchingAccessCode(liveQuiz, "abc123")).toBeNull();
  });

  it("rejects wrong code", () => {
    expect(assertMatchingAccessCode(liveQuiz, "WRONG1")?.status).toBe(403);
  });
});

describe("assertJoinableLiveQuiz", () => {
  it("requires live_open", () => {
    expect(assertJoinableLiveQuiz({ ...liveQuiz, live_open: false })?.status).toBe(403);
  });
});

describe("assertJoinableExamQuiz", () => {
  it("requires exam_open", () => {
    expect(assertJoinableExamQuiz({ exam_open: false })?.status).toBe(403);
  });
});

describe("assertJoinableLiveStatus", () => {
  it("allows lobby and idle", () => {
    expect(assertJoinableLiveStatus({ ...liveQuiz, live_status: "lobby" })).toBeNull();
    expect(assertJoinableLiveStatus({ ...liveQuiz, live_status: "idle" })).toBeNull();
  });

  it("blocks finished round", () => {
    expect(assertJoinableLiveStatus({ ...liveQuiz, live_status: "finished" })?.status).toBe(409);
  });

  it("blocks when question already running", () => {
    expect(assertJoinableLiveStatus({ ...liveQuiz, live_status: "question" })?.status).toBe(409);
  });
});
