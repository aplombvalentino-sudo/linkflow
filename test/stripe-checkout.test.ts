// POST /api/stripe/checkout: auth gate, already-pro guard, customer reuse vs
// creation, and rate limiting.
import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: null as null | { uid: string; email?: string },
  db: null as unknown,
  configured: true,
  rateLimit: vi.fn(),
  customersCreate: vi.fn(),
  checkoutCreate: vi.fn(),
}));

vi.mock("@/lib/firebase/auth-server", () => ({ verifySession: async () => h.session }));
vi.mock("@/lib/firebase/admin", () => ({ getAdminDbOrThrow: () => h.db }));
vi.mock("@/lib/firebase/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => h.rateLimit(...args),
}));
vi.mock("@/lib/stripe/admin", () => ({
  isStripeConfigured: () => h.configured,
  getStripeOrThrow: () => ({
    customers: { create: h.customersCreate },
    checkout: { sessions: { create: h.checkoutCreate } },
  }),
}));

import { POST } from "@/app/api/stripe/checkout/route";

function userDb(userData: Record<string, unknown> | undefined) {
  const updates: unknown[] = [];
  return {
    collection: () => ({
      doc: () => ({
        get: async () => ({ data: () => userData }),
        update: async (data: unknown) => updates.push(data),
      }),
    }),
    updates,
  };
}

beforeEach(() => {
  h.session = { uid: "uid-1", email: "a@b.co" };
  h.configured = true;
  h.rateLimit = vi.fn().mockResolvedValue(undefined);
  h.customersCreate = vi.fn().mockResolvedValue({ id: "cus_new" });
  h.checkoutCreate = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/sess" });
  h.db = userDb({ email: "a@b.co", plan: "free" });
});

describe("POST /api/stripe/checkout", () => {
  it("401s when there is no session", async () => {
    h.session = null;
    const res = await POST();
    expect(res.status).toBe(401);
    expect(h.checkoutCreate).not.toHaveBeenCalled();
  });

  it("503s when Stripe isn't configured", async () => {
    h.configured = false;
    const res = await POST();
    expect(res.status).toBe(503);
  });

  it("400s with already-pro when the user already has the Pro plan", async () => {
    h.db = userDb({ plan: "pro" });
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("already-pro");
    expect(h.checkoutCreate).not.toHaveBeenCalled();
  });

  it("creates a new Stripe customer when none is stored, and persists it", async () => {
    const db = userDb({ email: "a@b.co", plan: "free" });
    h.db = db;
    await POST();
    expect(h.customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.co" }),
    );
    expect(db.updates).toEqual([{ stripeCustomerId: "cus_new" }]);
  });

  it("reuses an existing Stripe customer instead of creating a new one", async () => {
    h.db = userDb({ email: "a@b.co", plan: "free", stripeCustomerId: "cus_existing" });
    await POST();
    expect(h.customersCreate).not.toHaveBeenCalled();
    expect(h.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });

  it("enables the promotion-code field at checkout", async () => {
    await POST();
    expect(h.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ allow_promotion_codes: true }),
    );
  });

  it("returns the Stripe-hosted checkout URL on success", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/sess");
  });

  it("is rate-limited per user", async () => {
    await POST();
    expect(h.rateLimit).toHaveBeenCalledWith(
      "checkout:uid-1",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("propagates a rate-limit rejection as its mapped status", async () => {
    const { RateLimitError } = await import("@/lib/errors");
    h.rateLimit = vi.fn().mockRejectedValue(new RateLimitError());
    const res = await POST();
    expect(res.status).toBe(429);
  });
});
