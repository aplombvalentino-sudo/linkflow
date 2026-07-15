// Risk #4 — the Firestore-backed fixed-window rate limiter blocks past the limit.
import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/firebase/rate-limit";
import { RateLimitError } from "@/lib/errors";

type Row = { count: number; windowStart: number };

/** In-memory stand-in for the Admin Firestore surface checkRateLimit touches. */
function fakeDb(seed?: Record<string, Row>) {
  const store = new Map<string, Row>(Object.entries(seed ?? {}));
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ __path: `${name}/${id}` }),
    }),
    runTransaction: async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        get: async (ref: { __path: string }) => ({
          exists: store.has(ref.__path),
          data: () => store.get(ref.__path),
        }),
        set: (ref: { __path: string }, data: Row) => store.set(ref.__path, data),
        update: (ref: { __path: string }, data: Partial<Row>) =>
          store.set(ref.__path, { ...store.get(ref.__path)!, ...data }),
      }),
  };
  return { db, store };
}

describe("checkRateLimit (risk #4)", () => {
  it("allows up to the limit, then throws RateLimitError", async () => {
    const { db } = fakeDb();
    // limit 2 within a 60s window
    await expect(checkRateLimit("k", 2, 60_000, db as never)).resolves.toBeUndefined();
    await expect(checkRateLimit("k", 2, 60_000, db as never)).resolves.toBeUndefined();
    await expect(checkRateLimit("k", 2, 60_000, db as never)).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("resets once the window has elapsed", async () => {
    const { db } = fakeDb({
      "rateLimits/k": { count: 99, windowStart: Date.now() - 10 * 60_000 },
    });
    // window elapsed → counter resets, no throw
    await expect(checkRateLimit("k", 2, 60_000, db as never)).resolves.toBeUndefined();
  });
});
