import { describe, expect, it } from "vitest";

import {
  GENERIC_SERVER_ERROR,
  internalErrorResponse,
  rateLimitResponse,
} from "@/lib/server/http-errors";

describe("http-errors", () => {
  it("internalErrorResponse returns generic message", async () => {
    const res = internalErrorResponse("test", new Error("secret db failure"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.detail).toBe(GENERIC_SERVER_ERROR);
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("rateLimitResponse includes Retry-After", () => {
    const res = rateLimitResponse(42);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });
});
