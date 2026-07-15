// queries.ts server functions. admin + rate-limit are mocked so no real Firebase
// is touched. Covers: input validation, typed errors, read cap, per-user handle
// rate limiting, analytics-read rate limiting (risk #5), and graceful
// admin-unavailable handling in every function (risks #8–#11).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import {
  HandleTakenError,
  RateLimitError,
  ValidationError,
  ServiceUnavailableError,
} from "@/lib/errors";
import {
  MAX_EVENTS_SCAN,
  RESERVE_HANDLE_LIMIT,
  RESERVE_HANDLE_WINDOW_MS,
  STATS_LIMIT,
  STATS_WINDOW_MS,
} from "@/lib/constants";

const h = vi.hoisted(() => ({
  db: null as unknown,
  dbError: null as Error | null,
  rateLimit: null as null | ((...a: unknown[]) => Promise<void>),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDbOrThrow: () => {
    if (h.dbError) throw h.dbError;
    return h.db;
  },
}));
vi.mock("@/lib/firebase/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => h.rateLimit!(...args),
}));

import {
  recordView,
  recordClick,
  reserveHandle,
  getProfileStats,
} from "@/lib/firebase/queries";

beforeEach(() => {
  h.db = null;
  h.dbError = null;
  h.rateLimit = vi.fn().mockResolvedValue(undefined);
});

describe("recordView input validation (risk #7 — prior pass)", () => {
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

describe("reserveHandle (rate-limit + typed error)", () => {
  it("is rate-limited per user before touching the DB", async () => {
    h.db = handleDb(new Set());
    await reserveHandle("sam", "p1", "u1");
    expect(h.rateLimit).toHaveBeenCalledWith(
      "reserveHandle:u1",
      RESERVE_HANDLE_LIMIT,
      RESERVE_HANDLE_WINDOW_MS,
    );
  });

  it("throws a typed HandleTakenError on collision", async () => {
    h.db = handleDb(new Set(["sam"]));
    await expect(reserveHandle("Sam", "p1", "u1")).rejects.toBeInstanceOf(HandleTakenError);
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

/** Mocks profileViews/linkClicks queries plus a statsCache doc store (Map-backed,
 *  shared across calls in a test so a "set" from one call is visible to the
 *  next "get"). `queryCalls` counts how many times the big collections were
 *  actually queried, so cache-hit tests can assert they were skipped. */
function statsDb(
  views: unknown[],
  clicks: unknown[],
  cap: { limit?: number },
  cacheStore: Map<string, { stats: unknown; computedAtMs: number }> = new Map(),
) {
  const queryCalls = { count: 0 };
  const db = {
    collection: (name: string) => {
      if (name === "statsCache") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: cacheStore.has(id),
              data: () => cacheStore.get(id),
            }),
            set: async (value: { stats: unknown; computedAtMs: number }) => {
              cacheStore.set(id, value);
            },
          }),
        };
      }
      queryCalls.count++;
      return name === "profileViews"
        ? { where: () => chain(views, cap) }
        : { where: () => chain(clicks, {}) };
    },
  };
  return { db, cacheStore, queryCalls };
}

describe("getProfileStats read cap + rate limiting (risks #6 prior, #5)", () => {
  it("caps each query at MAX_EVENTS_SCAN and aggregates", async () => {
    const cap: { limit?: number } = {};
    const viewDocs = [
      { data: () => ({ viewedAt: Timestamp.fromMillis(Date.parse("2026-07-10T00:00:00Z")), referrer: "x.com" }) },
      { data: () => ({ viewedAt: Timestamp.fromMillis(Date.parse("2026-07-10T01:00:00Z")), referrer: "x.com" }) },
    ];
    h.db = statsDb(viewDocs, [{ data: () => ({}) }], cap).db;

    const stats = await getProfileStats("p1", 9999);
    expect(cap.limit).toBe(MAX_EVENTS_SCAN);
    expect(stats.totalViews).toBe(2);
    expect(stats.totalClicks).toBe(1);
    expect(stats.topReferrers[0]).toEqual({ referrer: "x.com", n: 2 });
  });

  it("rate-limits analytics reads per profile (risk #5)", async () => {
    h.db = statsDb([], [], {}).db;
    await getProfileStats("p1", 7);
    expect(h.rateLimit).toHaveBeenCalledWith("stats:p1", STATS_LIMIT, STATS_WINDOW_MS);
  });

  it("propagates a rate-limit rejection (risk #5)", async () => {
    h.rateLimit = vi.fn().mockRejectedValue(new RateLimitError());
    await expect(getProfileStats("p1", 7)).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("getProfileStats result caching (risk #4)", () => {
  it("a second call within the TTL reuses the cache and skips the big queries", async () => {
    const { db, queryCalls } = statsDb([], [], {});
    h.db = db;

    await getProfileStats("p1", 7);
    const firstCallQueries = queryCalls.count;
    expect(firstCallQueries).toBeGreaterThan(0);

    await getProfileStats("p1", 7);
    // no additional profileViews/linkClicks queries on the cache hit
    expect(queryCalls.count).toBe(firstCallQueries);
  });

  it("recomputes once the cache entry is expired", async () => {
    const cacheStore = new Map<string, { stats: unknown; computedAtMs: number }>();
    const { db, queryCalls } = statsDb([], [], {}, cacheStore);
    h.db = db;

    await getProfileStats("p1", 7);
    const afterFirst = queryCalls.count;

    // simulate an expired cache entry
    const key = [...cacheStore.keys()][0];
    cacheStore.set(key, { ...cacheStore.get(key)!, computedAtMs: Date.now() - 10 * 60_000 });

    await getProfileStats("p1", 7);
    expect(queryCalls.count).toBeGreaterThan(afterFirst);
  });

  it("different windows (days) get independent cache entries", async () => {
    const { db, cacheStore } = statsDb([], [], {});
    h.db = db;
    await getProfileStats("p1", 7);
    await getProfileStats("p1", 30);
    expect(cacheStore.size).toBe(2);
  });
});

describe("graceful admin-unavailable handling (risks #8–#11)", () => {
  beforeEach(() => {
    h.dbError = new ServiceUnavailableError();
  });

  it("recordView surfaces ServiceUnavailableError (risk #9)", async () => {
    await expect(recordView("p1", null, "mobile", "hash")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  it("recordClick surfaces ServiceUnavailableError (risk #10)", async () => {
    await expect(recordClick("l1", null, "mobile", "hash")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  it("reserveHandle surfaces ServiceUnavailableError (risk #8)", async () => {
    await expect(reserveHandle("sam", "p1", "u1")).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  it("getProfileStats surfaces ServiceUnavailableError (risk #11)", async () => {
    await expect(getProfileStats("p1", 7)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });
});
