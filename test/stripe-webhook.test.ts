// Stripe webhook: signature verification (the single most security-critical
// piece — an unverified webhook lets anyone POST a fake "payment succeeded"
// event for free Pro access) and the plan-sync handlers it gates.
import { describe, it, expect, beforeEach, vi } from "vitest";

const h = vi.hoisted(() => ({
  db: null as unknown,
  constructEvent: vi.fn(),
  configured: true,
}));

vi.mock("@/lib/firebase/admin", () => ({ getAdminDbOrThrow: () => h.db }));
vi.mock("@/lib/stripe/admin", () => ({
  getStripeOrThrow: () => ({ webhooks: { constructEvent: h.constructEvent } }),
  getWebhookSecret: () => "whsec_test",
  isStripeConfigured: () => h.configured,
}));

import { POST } from "@/app/api/stripe/webhook/route";
import {
  handleCheckoutCompleted,
  handleSubscriptionDeleted,
} from "@/lib/stripe/webhook-handlers";

function fakeRequest(body: string, signature: string | null): Request {
  return {
    headers: { get: (name: string) => (name === "stripe-signature" ? signature : null) },
    text: async () => body,
  } as unknown as Request;
}

beforeEach(() => {
  h.db = null;
  h.constructEvent = vi.fn();
  h.configured = true;
});

describe("POST /api/stripe/webhook — signature verification", () => {
  it("503s when Stripe isn't configured", async () => {
    h.configured = false;
    const res = await POST(fakeRequest("{}", "sig") as never);
    expect(res.status).toBe(503);
    expect(h.constructEvent).not.toHaveBeenCalled();
  });

  it("400s when the Stripe-Signature header is missing", async () => {
    const res = await POST(fakeRequest("{}", null) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("missing-signature");
    expect(h.constructEvent).not.toHaveBeenCalled();
  });

  it("400s on an invalid signature and never touches the database", async () => {
    h.constructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });
    const dbSpy = vi.fn();
    h.db = { collection: dbSpy };

    const res = await POST(fakeRequest('{"fake":true}', "bad-sig") as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid-signature");
    expect(dbSpy).not.toHaveBeenCalled();
  });

  it("processes a correctly-signed event", async () => {
    h.constructEvent.mockReturnValue({ type: "unhandled.event.type", data: { object: {} } });
    const res = await POST(fakeRequest("{}", "good-sig") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });
});

function fakeUsersDb(existingByCustomerId?: { id: string }) {
  const updates: { id: string; data: unknown }[] = [];
  const docRef = (id: string) => ({
    update: async (data: unknown) => updates.push({ id, data }),
  });
  return {
    collection: () => ({
      doc: (id: string) => docRef(id),
      where: () => ({
        limit: () => ({
          get: async () => ({
            empty: !existingByCustomerId,
            docs: existingByCustomerId
              ? [{ id: existingByCustomerId.id, ref: docRef(existingByCustomerId.id) }]
              : [],
          }),
        }),
      }),
    }),
    updates,
  };
}

describe("handleCheckoutCompleted", () => {
  it("upgrades the referenced user to pro and stores the Stripe customer id", async () => {
    const db = fakeUsersDb();
    h.db = db;
    await handleCheckoutCompleted({
      client_reference_id: "uid-1",
      customer: "cus_abc",
    } as never);
    expect(db.updates).toEqual([
      { id: "uid-1", data: { plan: "pro", stripeCustomerId: "cus_abc" } },
    ]);
  });

  it("no-ops (does not throw) when client_reference_id is missing", async () => {
    const db = fakeUsersDb();
    h.db = db;
    await handleCheckoutCompleted({ client_reference_id: null, customer: "cus_abc" } as never);
    expect(db.updates).toEqual([]);
  });

  it("handles an expanded customer object, not just a string id", async () => {
    const db = fakeUsersDb();
    h.db = db;
    await handleCheckoutCompleted({
      client_reference_id: "uid-1",
      customer: { id: "cus_expanded" },
    } as never);
    expect(db.updates[0].data).toMatchObject({ stripeCustomerId: "cus_expanded" });
  });
});

describe("handleSubscriptionDeleted", () => {
  it("downgrades the user matching the Stripe customer id to free", async () => {
    const db = fakeUsersDb({ id: "uid-1" });
    h.db = db;
    await handleSubscriptionDeleted({ customer: "cus_abc" } as never);
    expect(db.updates).toEqual([{ id: "uid-1", data: { plan: "free" } }]);
  });

  it("no-ops when no user matches the customer id", async () => {
    const db = fakeUsersDb(undefined);
    h.db = db;
    await handleSubscriptionDeleted({ customer: "cus_orphan" } as never);
    expect(db.updates).toEqual([]);
  });
});
