// Distributed fixed-window rate limiter backed by Firestore (risk #4). Because
// the counter lives in Firestore, the limit holds across all serverless
// instances, not just one process. Used to cap abusive handle-reservation
// attempts, and reusable for any other server action.
import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "./admin";
import { RateLimitError } from "@/lib/errors";

/** Increment the window counter for `key`; throw RateLimitError once `limit`
 *  is exceeded within `windowMs`. `db` is injectable for testing. */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  db: Firestore = getAdminDb(),
): Promise<void> {
  const ref = db.collection("rateLimits").doc(key);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists
      ? (snap.data() as { count: number; windowStart: number })
      : undefined;

    if (!data || now - data.windowStart >= windowMs) {
      // fresh window
      tx.set(ref, { count: 1, windowStart: now });
      return;
    }
    if (data.count >= limit) {
      throw new RateLimitError();
    }
    tx.update(ref, { count: data.count + 1 });
  });
}
