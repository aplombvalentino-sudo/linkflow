// verifySession cryptographic gate (prior risk #2) + error logging on failure
// (risk #7), and mintSessionCookie error handling (risk #6).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ServiceUnavailableError } from "@/lib/errors";

const h = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  verify: vi.fn(),
  create: vi.fn(),
  authError: null as Error | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (_name: string) => (h.cookie ? { value: h.cookie } : undefined),
  }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => {
    if (h.authError) throw h.authError;
    return { verifySessionCookie: h.verify, createSessionCookie: h.create };
  },
}));

import { verifySession, mintSessionCookie } from "@/lib/firebase/auth-server";

beforeEach(() => {
  h.cookie = undefined;
  h.verify = vi.fn();
  h.create = vi.fn();
  h.authError = null;
  vi.restoreAllMocks();
});

describe("verifySession (prior risk #2 + logging risk #7)", () => {
  it("returns null and skips verification when no cookie is present", async () => {
    const result = await verifySession();
    expect(result).toBeNull();
    expect(h.verify).not.toHaveBeenCalled();
  });

  it("verifies the cookie (checkRevoked=true) and returns the decoded token", async () => {
    h.cookie = "cookie-value";
    h.verify.mockResolvedValue({ uid: "u1" });
    const result = await verifySession();
    expect(h.verify).toHaveBeenCalledWith("cookie-value", true);
    expect(result).toEqual({ uid: "u1" });
  });

  it("logs and returns null when verification fails (risk #7)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.cookie = "tampered";
    h.verify.mockRejectedValue(new Error("invalid cookie"));
    expect(await verifySession()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("logs and returns null when the Admin SDK itself is unavailable (risk #7)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    h.cookie = "any";
    h.authError = new Error("admin misconfigured");
    expect(await verifySession()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe("mintSessionCookie error handling (risk #6)", () => {
  it("returns the minted cookie on success", async () => {
    h.create.mockResolvedValue("session-cookie");
    expect(await mintSessionCookie("id-token")).toBe("session-cookie");
  });

  it("logs and throws ServiceUnavailableError when the Admin SDK is unavailable", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    h.authError = new Error("admin misconfigured");
    await expect(mintSessionCookie("id-token")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(err).toHaveBeenCalled();
  });

  it("logs and throws ServiceUnavailableError when cookie creation fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    h.create.mockRejectedValue(new Error("mint failed"));
    await expect(mintSessionCookie("id-token")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(err).toHaveBeenCalled();
  });
});
