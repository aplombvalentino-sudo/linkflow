// Risks #4/#5 (reserveHandle: rate-limited + typed error), #6 (getProfileStats
// read cap), #7 (recordView input validation). admin + rate-limit are mocked so
// no real Firebase is touched.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { HandleTakenError, RateLimitError, ValidationError } from "@/lib/errors";
import {
  MAX_EVENTS_SCAN,
  RESERVE_HANDLE_LIMIT,
  RESERVE_HANDLE_WINDOW_MS,
} from "@/lib/constants";

const h = vi.hoisted(() => ({
  db: null as unknown,
  rateLimit: null as null | ((...a: unknown[]) => Promise<void>),
}));

vi.mock("@/lib/firebase/admin", () => ({ getAdminDb: () => h.db }));
vi.mock("@/lib/firebase/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => h.rateLimit!(...args),
}));

import { recordView, reserveHandle, getProfileStats } from "@/lib/firebase/queries";

beforeEach(() => {
  h.db = null;
  h.rateLimit = vi.fn().mockResolvedValue(undefined);
});

describe("recordView input validation (risk #7)", () => {
  it("rejects a malformed device and never writes", async () => {
    const add = vi.fn();
    h.db = { collection: () => ({ add }) };
    await expect(
      // @ts-expect-error — deliberately invalid device at the boundary
      recordView("p1", null, "watch", "hash"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(add).not.toHaveBeenCalled();
  });

  it("writes a validated view", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    h.db = { collection: () => ({ add }) };
    await recordView("p1", "https://x.com", "mobile", "hash");
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0]).toMatchObject({
      profileId: "p1",
      device: "mobile",
      visitorHash: "hash",
    });
  });
});

function handleDb(existing: Set<string>) {
  const sets: { id: string }[] = [];
  return {
    collection: () => ({ doc: (id: string) => ({ __id: id }) }),
    runTransaction: async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        get: async (ref: { __id: string }) => ({ exists: existing.has(ref.__id) }),
        set: (ref: { __id: string }) => sets.push({ id: ref.__id }),
        update: () => {},
      }),
    __sets: sets,
  };
}

describe("reserveHandle (risks #4, #5)", () => {
  it("is rate-limited per user before touching the DB", async () => {
    h.db = handleDb(new Set());
    await reserveHandle("sam", "p1", "u1");
    expect(h.rateLimit).toHaveBeenCalledWith(
      "reserveHandle:u1",
      RESERVE_HANDLE_LIMIT,
      RESERVE_HANDLE_WINDOW_MS,
    );
  });

  it("throws a typed HandleTakenError on collision (not a generic Error)", async () => {
    h.db = handleDb(new Set(["sam"]));
    await expect(reserveHandle("Sam", "p1", "u1")).rejects.toBeInstanceOf(HandleTakenError);
    await expect(reserveHandle("Sam", "p1", "u1")).rejects.toMatchObject({
      code: "handle-taken",
    });
  });

  it("reserves a free handle", async () => {
    const db = handleDb(new Set());
    h.db = db;
    await reserveHandle("sam", "p1", "u1");
    expect(db.__sets).toEqual([{ id: "sam" }]);
  });

  it("rejects a reserved handle before rate-limiting or DB", async () => {
    h.db = handleDb(new Set());
    await expect(reserveHandle("admin", "p1", "u1")).rejects.toBeInstanceOf(ValidationError);
    expect(h.rateLimit).not.toHaveBeenCalled();
  });

  it("propagates a rate-limit rejection", async () => {
    h.rateLimit = vi.fn().mockRejectedValue(new RateLimitError());
    h.db = handleDb(new Set());
    await expect(reserveHandle("sam", "p1", "u1")).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("getProfileStats read cap (risk #6)", () => {
  it("caps each query at MAX_EVENTS_SCAN and aggregates", async () => {
    const captured: { limit?: number } = {};
    const viewDocs = [
      { data: () => ({ viewedAt: Timestamp.fromMillis(Date.parse("2026-07-10T00:00:00Z")), referrer: "x.com" }) },
      { data: () => ({ viewedAt: Timestamp.fromMillis(Date.parse("2026-07-10T01:00:00Z")), referrer: "x.com" }) },
    ];
    const clickDocs = [{ data: () => ({}) }];

    const chain = (docs: unknown[], cap: { limit?: number }) => {
      const c: Record<string, unknown> = {};
      c.where = () => c;
      c.limit = (n: number) => {
        cap.limit = n;
        return c;
      };
      c.get = async () => ({ size: docs.length, docs });
      return c;
    };

    h.db = {
      collection: (name: string) =>
        name === "profileViews"
          ? { where: () => chain(viewDocs, captured) }
          : { where: () => chain(clickDocs, {}) },
    };

    const stats = await getProfileStats("p1", 9999);
    expect(captured.limit).toBe(MAX_EVENTS_SCAN);
    expect(stats.totalViews).toBe(2);
    expect(stats.totalClicks).toBe(1);
    expect(stats.topReferrers[0]).toEqual({ referrer: "x.com", n: 2 });
  });
});
