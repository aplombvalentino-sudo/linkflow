// Cloudflare Turnstile bot-check gate on /api/auth/session. verifyTurnstileToken
// must fail CLOSED (never let a bot through) on any missing secret, a rejected
// solve, or a network/parse error — an outage on Cloudflare's side must not
// become an open door.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyTurnstileToken } from "@/lib/turnstile-server";
import { TURNSTILE_VERIFY_URL } from "@/lib/constants";

const saved = process.env.TURNSTILE_SECRET_KEY;

beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
});

afterEach(() => {
  if (saved === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = saved;
  vi.unstubAllGlobals();
});

describe("verifyTurnstileToken", () => {
  it("returns true when Cloudflare reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstileToken("good-token")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    expect(init.method).toBe("POST");
    const sent = new URLSearchParams(init.body as string);
    expect(sent.get("secret")).toBe("test-secret");
    expect(sent.get("response")).toBe("good-token");
  });

  it("includes the visitor IP as remoteip when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);

    await verifyTurnstileToken("token", "203.0.113.7");

    const sent = new URLSearchParams(fetchMock.mock.calls[0][1].body as string);
    expect(sent.get("remoteip")).toBe("203.0.113.7");
  });

  it("returns false when Cloudflare rejects the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }),
    );
    await expect(verifyTurnstileToken("bad-token")).resolves.toBe(false);
  });

  it("fails closed on a network error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(verifyTurnstileToken("token")).resolves.toBe(false);

    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe("turnstile_verify_failed");
    expect(logged.message).toContain("network down");
    spy.mockRestore();
  });

  it("fails closed without ever calling fetch when no secret is configured", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstileToken("token")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("isTurnstileEnabled", () => {
  it("is true only when TURNSTILE_SECRET_KEY is set at module load", async () => {
    vi.resetModules();
    process.env.TURNSTILE_SECRET_KEY = "present";
    const enabled = await import("@/lib/turnstile-server");
    expect(enabled.isTurnstileEnabled).toBe(true);

    vi.resetModules();
    delete process.env.TURNSTILE_SECRET_KEY;
    const disabled = await import("@/lib/turnstile-server");
    expect(disabled.isTurnstileEnabled).toBe(false);
  });
});
