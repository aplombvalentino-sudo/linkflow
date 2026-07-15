// Server-side data functions — the Firestore/Admin-SDK equivalents of the
// former Postgres security-definer RPCs (specs/architecture.md).
// All run with Admin privileges, so each enforces ownership explicitly.
import "server-only";
import { adminDb } from "./admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type Device = "mobile" | "tablet" | "desktop";

/** record_view — append-only. Raw IP is never stored; caller passes a
 *  daily-salted visitorHash computed at the edge. */
export async function recordView(
  profileId: string,
  referrer: string | null,
  device: Device,
  visitorHash: string,
): Promise<void> {
  await adminDb.collection("profileViews").add({
    profileId,
    referrer,
    device,
    visitorHash,
    viewedAt: FieldValue.serverTimestamp(),
  });
}

/** record_click — logs the click, bumps the denormalized counter, returns the
 *  destination URL (null if the link is missing/inactive). Powers /r/[linkId]. */
export async function recordClick(
  linkId: string,
  referrer: string | null,
  device: Device,
  visitorHash: string,
): Promise<string | null> {
  const linkRef = adminDb.collection("links").doc(linkId);
  const snap = await linkRef.get();
  if (!snap.exists) return null;
  const link = snap.data() as { url: string; profileId: string; isActive: boolean };
  if (!link.isActive) return null;

  await adminDb.collection("linkClicks").add({
    linkId,
    profileId: link.profileId,
    referrer,
    device,
    visitorHash,
    clickedAt: FieldValue.serverTimestamp(),
  });
  await linkRef.update({ clickCount: FieldValue.increment(1) });
  return link.url;
}

/** reserve_handle — Firestore has no unique constraint, so uniqueness is a
 *  transaction against handles/{handle} (doc id = lowercased handle). */
export async function reserveHandle(
  handle: string,
  profileId: string,
  userId: string,
): Promise<void> {
  const ref = adminDb.collection("handles").doc(handle.toLowerCase());
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) throw new Error("handle-taken");
    tx.set(ref, { profileId, userId, createdAt: FieldValue.serverTimestamp() });
  });
}

export interface ProfileStats {
  totalViews: number;
  totalClicks: number;
  daily: { day: string; views: number }[];
  topReferrers: { referrer: string; n: number }[];
}

/** get_profile_stats — Firestore has no SQL aggregation, so we read the event
 *  window via Admin and fold it in JS. Ownership is checked by the caller
 *  (dashboard Server Component already knows the signed-in uid owns profileId).
 *  Free plan caps days at 7 upstream. */
export async function getProfileStats(
  profileId: string,
  days: number,
): Promise<ProfileStats> {
  const since = Timestamp.fromMillis(Date.now() - days * 86_400_000);

  const [viewsSnap, clicksSnap] = await Promise.all([
    adminDb
      .collection("profileViews")
      .where("profileId", "==", profileId)
      .where("viewedAt", ">", since)
      .get(),
    adminDb
      .collection("linkClicks")
      .where("profileId", "==", profileId)
      .where("clickedAt", ">", since)
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

  return {
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
}
