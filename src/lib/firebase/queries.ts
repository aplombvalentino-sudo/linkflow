// Server-side data functions — the Firestore/Admin-SDK equivalents of the
// former Postgres security-definer RPCs (specs/architecture.md).
// All run with Admin privileges, so each validates input + enforces ownership.
import "server-only";
import { getAdminDbOrThrow } from "./admin";
import { checkRateLimit } from "./rate-limit";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  validateEventInput,
  assertId,
  assertDevice,
  assertVisitorHash,
  normalizeReferrer,
  assertHandle,
  clampStatsDays,
  type Device,
} from "@/lib/validation";
import { HandleTakenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  MAX_EVENTS_SCAN,
  RESERVE_HANDLE_LIMIT,
  RESERVE_HANDLE_WINDOW_MS,
  STATS_LIMIT,
  STATS_WINDOW_MS,
  STATS_CACHE_TTL_MS,
} from "@/lib/constants";
import type { Firestore } from "firebase-admin/firestore";

export type { Device };

/** record_view — append-only. Raw IP is never stored; caller passes a
 *  daily-salted visitorHash computed at the edge. Inputs are validated (risk #7). */
export async function recordView(
  profileId: string,
  referrer: string | null,
  device: Device,
  visitorHash: string,
): Promise<void> {
  const input = validateEventInput(profileId, referrer, device, visitorHash);
  await getAdminDbOrThrow().collection("profileViews").add({
    ...input,
    viewedAt: FieldValue.serverTimestamp(),
  });
}

/** record_click — logs the click, bumps the denormalized counter, returns the
 *  destination URL (null if the link is missing/inactive). Powers /r/[linkId].
 *  Inputs are validated (risk #7). */
export async function recordClick(
  linkId: string,
  referrer: string | null,
  device: Device,
  visitorHash: string,
): Promise<string | null> {
  const id = assertId(linkId, "linkId");
  const cleanReferrer = normalizeReferrer(referrer);
  const cleanDevice = assertDevice(device);
  const cleanHash = assertVisitorHash(visitorHash);

  const db = getAdminDbOrThrow();
  const linkRef = db.collection("links").doc(id);
  const snap = await linkRef.get();
  if (!snap.exists) return null;
  const link = snap.data() as { url: string; profileId: string; isActive: boolean };
  if (!link.isActive) return null;

  await db.collection("linkClicks").add({
    linkId: id,
    profileId: link.profileId,
    referrer: cleanReferrer,
    device: cleanDevice,
    visitorHash: cleanHash,
    clickedAt: FieldValue.serverTimestamp(),
  });
  await linkRef.update({ clickCount: FieldValue.increment(1) });
  return link.url;
}

/** reserve_handle — Firestore has no unique constraint, so uniqueness is a
 *  transaction against handles/{handle}. Rate-limited per user (risk #4) and
 *  throws a typed HandleTakenError with logging on collision (risk #5). */
export async function reserveHandle(
  handle: string,
  profileId: string,
  userId: string,
): Promise<void> {
  const normalized = assertHandle(handle);
  const pid = assertId(profileId, "profileId");
  const uid = assertId(userId, "userId");

  await checkRateLimit(
    `reserveHandle:${uid}`,
    RESERVE_HANDLE_LIMIT,
    RESERVE_HANDLE_WINDOW_MS,
  );

  const db = getAdminDbOrThrow();
  const ref = db.collection("handles").doc(normalized);
  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (doc.exists) throw new HandleTakenError(normalized);
      tx.set(ref, {
        profileId: pid,
        userId: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof HandleTakenError) {
      logger.warn("handle_reservation_collision", { handle: normalized, userId: uid });
      throw err;
    }
    logger.error("handle_reservation_failed", {
      handle: normalized,
      userId: uid,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export interface ProfileStats {
  totalViews: number;
  totalClicks: number;
  daily: { day: string; views: number }[];
  topReferrers: { referrer: string; n: number }[];
}

interface StatsCacheDoc {
  stats: ProfileStats;
  computedAtMs: number;
}

function statsCacheKey(profileId: string, windowDays: number): string {
  return `${profileId}_${windowDays}`;
}

/** Read a still-fresh cached aggregate, or null if missing/expired. Uses a
 *  process-measured `computedAtMs` (not FieldValue.serverTimestamp()) so the
 *  TTL comparison stays internally consistent even under host clock skew — the
 *  same process measures both the write and the elapsed time since. */
async function getCachedStats(
  db: Firestore,
  cacheKey: string,
): Promise<ProfileStats | null> {
  const snap = await db.collection("statsCache").doc(cacheKey).get();
  if (!snap.exists) return null;
  const data = snap.data() as StatsCacheDoc;
  if (Date.now() - data.computedAtMs > STATS_CACHE_TTL_MS) return null;
  return data.stats;
}

async function setCachedStats(
  db: Firestore,
  cacheKey: string,
  stats: ProfileStats,
): Promise<void> {
  await db
    .collection("statsCache")
    .doc(cacheKey)
    .set({ stats, computedAtMs: Date.now() } satisfies StatsCacheDoc);
}

/** get_profile_stats — Firestore has no SQL aggregation, so we read the event
 *  window via Admin and fold it in JS. The window is clamped and each query is
 *  capped at MAX_EVENTS_SCAN docs so a hot profile can't run up unbounded reads.
 *  A short-TTL cache (risk #4) additionally avoids re-scanning the event window
 *  on every call within STATS_CACHE_TTL_MS — a dashboard polling for updates
 *  reuses the same computed aggregate instead of paying the full read+fold cost
 *  each time. Full pre-aggregation via Cloud Functions/BigQuery remains the
 *  further scale-up path for very high event volumes. Ownership is checked by
 *  the caller.
 *  vibeguard-treated(architecture): Analytics Data Aggregation Performance Risk */
export async function getProfileStats(
  profileId: string,
  days: number,
): Promise<ProfileStats> {
  const pid = assertId(profileId, "profileId");
  // Cap how often analytics can be pulled per profile.
  await checkRateLimit(`stats:${pid}`, STATS_LIMIT, STATS_WINDOW_MS);
  const windowDays = clampStatsDays(days);
  const db = getAdminDbOrThrow();
  const cacheKey = statsCacheKey(pid, windowDays);

  const cached = await getCachedStats(db, cacheKey);
  if (cached) return cached;

  const since = Timestamp.fromMillis(Date.now() - windowDays * 86_400_000);

  const [viewsSnap, clicksSnap] = await Promise.all([
    db
      .collection("profileViews")
      .where("profileId", "==", pid)
      .where("viewedAt", ">", since)
      .limit(MAX_EVENTS_SCAN)
      .get(),
    db
      .collection("linkClicks")
      .where("profileId", "==", pid)
      .where("clickedAt", ">", since)
      .limit(MAX_EVENTS_SCAN)
      .get(),
  ]);

  const dayMap = new Map<string, number>();
  const refMap = new Map<string, number>();
  for (const doc of viewsSnap.docs) {
    const d = doc.data();
    const day = (d.viewedAt as Timestamp).toDate().toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    if (d.referrer) refMap.set(d.referrer, (refMap.get(d.referrer) ?? 0) + 1);
  }

  const stats: ProfileStats = {
    totalViews: viewsSnap.size,
    totalClicks: clicksSnap.size,
    daily: [...dayMap.entries()]
      .map(([day, views]) => ({ day, views }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    topReferrers: [...refMap.entries()]
      .map(([referrer, n]) => ({ referrer, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5),
  };

  await setCachedStats(db, cacheKey, stats);
  return stats;
}
