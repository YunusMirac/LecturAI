import { describe, expect, it } from "vitest";

import {
  generateAccessCode,
  isValidAccessCodeFormat,
  normalizeAccessCode,
} from "@/lib/server/quiz-access-code";

describe("normalizeAccessCode", () => {
  it("trims, uppercases and strips non-alphanumeric", () => {
    expect(normalizeAccessCode("  ab-c1  ")).toBe("ABC1");
  });
});

describe("isValidAccessCodeFormat", () => {
  it("accepts 4–8 alphanumeric chars", () => {
    expect(isValidAccessCodeFormat("ABCD")).toBe(true);
    expect(isValidAccessCodeFormat("ABCDEFGH")).toBe(true);
  });

  it("rejects too short or invalid chars", () => {
    expect(isValidAccessCodeFormat("ABC")).toBe(false);
    expect(isValidAccessCodeFormat("ABC!")).toBe(false);
  });
});

describe("generateAccessCode", () => {
  it("returns code of requested length in valid charset", () => {
    const code = generateAccessCode(6);
    expect(code).toHaveLength(6);
    expect(isValidAccessCodeFormat(code)).toBe(true);
  });
});
