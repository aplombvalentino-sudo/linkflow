// Risk #2 — verifySession cryptographically verifies the session cookie via the
// Admin SDK, and returns null (→ redirect) for absent/invalid/expired cookies.
import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  verify: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (_name: string) => (h.cookie ? { value: h.cookie } : undefined),
  }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifySessionCookie: h.verify }),
}));

import { verifySession } from "@/lib/firebase/auth-server";

beforeEach(() => {
  h.cookie = undefined;
  h.verify = vi.fn();
});

describe("verifySession (risk #2)", () => {
  it("returns null and skips verification when no cookie is present", async () => {
    const result = await verifySession();
    expect(result).toBeNull();
    expect(h.verify).not.toHaveBeenCalled();
  });

  it("cryptographically verifies the cookie (checkRevoked=true) and returns the decoded token", async () => {
    h.cookie = "cookie-value";
    h.verify.mockResolvedValue({ uid: "u1" });
    const result = await verifySession();
    expect(h.verify).toHaveBeenCalledWith("cookie-value", true);
    expect(result).toEqual({ uid: "u1" });
  });

  it("returns null when the cookie fails verification (forged/expired/revoked)", async () => {
    h.cookie = "tampered";
    h.verify.mockRejectedValue(new Error("invalid"));
    expect(await verifySession()).toBeNull();
  });
});
