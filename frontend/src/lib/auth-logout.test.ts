import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignOut = vi.fn();
const mockAssign = vi.fn();

vi.mock("@/lib/api/authApi", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

describe("performLogout", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue(undefined);
    mockAssign.mockReset();
    vi.stubGlobal("window", { location: { assign: mockAssign } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses navigate callback when provided", async () => {
    const navigate = vi.fn();
    const { performLogout } = await import("@/lib/auth-logout");
    await performLogout("/login", navigate);

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("falls back to hard redirect without navigate", async () => {
    const { performLogout } = await import("@/lib/auth-logout");
    await performLogout("/login");

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockAssign).toHaveBeenCalledWith("/login");
  });
});
