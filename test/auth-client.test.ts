// Risks #1 (real Firebase auth + session exchange) and #8 (demo detection via
// the shared isFirebaseConfigured flag). firebase/auth + client are mocked.
import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  configured: true,
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  auth: {},
  get isFirebaseConfigured() {
    return h.configured;
  },
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...a: unknown[]) => h.signIn(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => h.signUp(...a),
}));

import { submitAuth } from "@/lib/firebase/auth-client";

beforeEach(() => {
  h.configured = true;
  h.signIn = vi.fn();
  h.signUp = vi.fn();
  vi.restoreAllMocks();
});

describe("submitAuth (risks #1, #8)", () => {
  it("returns demo (no real auth) when Firebase isn't configured", async () => {
    h.configured = false;
    const res = await submitAuth({ mode: "login", email: "a@b.co", password: "pw" });
    expect(res).toEqual({ ok: false, code: "demo" });
    expect(h.signIn).not.toHaveBeenCalled();
  });

  it("authenticates and exchanges the ID token for a session cookie", async () => {
    h.signIn.mockResolvedValue({ user: { getIdToken: async () => "id-token" } });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitAuth({ mode: "login", email: "a@b.co", password: "pw" });

    expect(h.signIn).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/session",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.idToken).toBe("id-token");
    expect(res.ok).toBe(true);
  });

  it("surfaces a handle-taken error from the session route", async () => {
    h.signUp.mockResolvedValue({ user: { getIdToken: async () => "id-token" } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "handle-taken" }) }),
    );

    const res = await submitAuth({
      mode: "signup",
      email: "a@b.co",
      password: "pw",
      handle: "taken",
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("handle-taken");
    expect(res.message).toMatch(/taken/i);
  });

  it("maps a Firebase auth error code to a friendly message", async () => {
    h.signIn.mockRejectedValue({ code: "auth/invalid-credential" });
    const res = await submitAuth({ mode: "login", email: "a@b.co", password: "bad" });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("auth/invalid-credential");
    expect(res.message).toMatch(/wrong email or password/i);
  });
});
