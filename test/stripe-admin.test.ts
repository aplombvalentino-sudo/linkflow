// Stripe lib guards: lazy init, missing-key errors, and config detection.
// Mirrors test/admin-credential.test.ts's pattern for the Firebase Admin lib.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const KEYS = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  vi.resetModules();
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getStripeOrThrow", () => {
  it("throws a logged ServiceUnavailableError when STRIPE_SECRET_KEY is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Import both from the SAME fresh module registration (post-resetModules)
    // so `instanceof` compares the same class identity as the thrown error.
    const { ServiceUnavailableError } = await import("@/lib/errors");
    const { getStripeOrThrow } = await import("@/lib/stripe/admin");
    expect(() => getStripeOrThrow()).toThrow(ServiceUnavailableError);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns a Stripe client when the key is present", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_unit_test";
    const { getStripeOrThrow } = await import("@/lib/stripe/admin");
    expect(getStripeOrThrow()).toBeTruthy();
  });
});

describe("getWebhookSecret", () => {
  it("throws when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { getWebhookSecret } = await import("@/lib/stripe/admin");
    expect(() => getWebhookSecret()).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it("returns the secret when present", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc123";
    const { getWebhookSecret } = await import("@/lib/stripe/admin");
    expect(getWebhookSecret()).toBe("whsec_abc123");
  });
});

describe("isStripeConfigured", () => {
  it("is false when either var is missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc123";
    const { isStripeConfigured } = await import("@/lib/stripe/admin");
    expect(isStripeConfigured()).toBe(false);
  });

  it("is false for the .env.local.example placeholder values", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_xxx";
    const { isStripeConfigured } = await import("@/lib/stripe/admin");
    expect(isStripeConfigured()).toBe(false);
  });

  it("is true for real-looking values", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_realvalue";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_realvalue";
    const { isStripeConfigured } = await import("@/lib/stripe/admin");
    expect(isStripeConfigured()).toBe(true);
  });
});
