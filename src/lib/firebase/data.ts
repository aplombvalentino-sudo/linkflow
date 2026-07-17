// Server-side read layer (Admin SDK) for profiles, links, and users. All
// dashboard reads and the public profile render go through here. Writes live in
// src/lib/actions/*. Never imported from a Client Component.
import "server-only";
import { createHash } from "node:crypto";
import type { DocumentData } from "firebase-admin/firestore";
import { getAdminDbOrThrow } from "./admin";
import { recordView, recordClick } from "./queries";
import type { Theme, BackgroundStyle, Device } from "@/lib/validation";
import { DEFAULT_BACKGROUND_STYLE } from "@/lib/constants";

export type Plan = "free" | "pro";

export interface ProfileDoc {
  id: string;
  userId: string;
  handle: string;
  handleLower: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  theme: Theme;
  isPublished: boolean;
  backgroundStyle: BackgroundStyle;
  backgroundImageUrl: string | null;
  backgroundColor: string | null;
  /** Pro-only: the profile owner's own Spline (spline.design) scene URL, used
   *  as the public page's backdrop when backgroundStyle === "spline". */
  backgroundSplineUrl: string | null;
}

export interface LinkDoc {
  id: string;
  profileId: string;
  userId: string;
  title: string;
  url: string;
  meta: string;
  thumbnailUrl: string | null;
  position: number;
  isActive: boolean;
  clickCount: number;
}

function toProfile(id: string, d: DocumentData): ProfileDoc {
  return {
    id,
    userId: d.userId,
    handle: d.handle ?? d.handleLower ?? "",
    handleLower: d.handleLower ?? d.handle ?? "",
    displayName: d.displayName ?? "",
    bio: d.bio ?? "",
    avatarUrl: d.avatarUrl ?? null,
    theme: (d.theme as Theme) ?? "volt",
    isPublished: d.isPublished !== false,
    backgroundStyle: (d.backgroundStyle as BackgroundStyle) ?? DEFAULT_BACKGROUND_STYLE,
    backgroundImageUrl: d.backgroundImageUrl ?? null,
    backgroundColor: d.backgroundColor ?? null,
    backgroundSplineUrl: d.backgroundSplineUrl ?? null,
  };
}

function toLink(id: string, d: DocumentData): LinkDoc {
  return {
    id,
    profileId: d.profileId,
    userId: d.userId,
    title: d.title ?? "",
    url: d.url ?? "",
    meta: d.meta ?? "",
    thumbnailUrl: d.thumbnailUrl ?? null,
    position: typeof d.position === "number" ? d.position : 0,
    isActive: d.isActive !== false,
    clickCount: typeof d.clickCount === "number" ? d.clickCount : 0,
  };
}

/** All profiles owned by a user, oldest first (createdAt not required — sorted
 *  in JS to avoid a composite-index dependency). */
export async function getProfilesForUser(uid: string): Promise<ProfileDoc[]> {
  const snap = await getAdminDbOrThrow()
    .collection("profiles")
    .where("userId", "==", uid)
    .get();
  return snap.docs
    .map((doc) => toProfile(doc.id, doc.data()))
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

export async function getProfileById(profileId: string): Promise<ProfileDoc | null> {
  const doc = await getAdminDbOrThrow().collection("profiles").doc(profileId).get();
  return doc.exists ? toProfile(doc.id, doc.data()!) : null;
}

/** Look up a profile by its (case-insensitive) handle via the handles/ lock
 *  collection. Returns null if the handle is unregistered or the profile is
 *  gone. Does NOT enforce isPublished — the caller decides. */
export async function getProfileByHandle(handle: string): Promise<ProfileDoc | null> {
  const db = getAdminDbOrThrow();
  const handleLower = handle.trim().toLowerCase();
  const handleDoc = await db.collection("handles").doc(handleLower).get();
  if (!handleDoc.exists) return null;
  const profileId = handleDoc.data()?.profileId as string | undefined;
  if (!profileId) return null;
  return getProfileById(profileId);
}

/** Links for a profile, ordered by position (sorted in JS — a where(profileId)
 *  query only needs the auto single-field index). */
export async function getLinksForProfile(
  profileId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<LinkDoc[]> {
  const snap = await getAdminDbOrThrow()
    .collection("links")
    .where("profileId", "==", profileId)
    .get();
  let links = snap.docs.map((doc) => toLink(doc.id, doc.data()));
  if (opts.activeOnly) links = links.filter((l) => l.isActive);
  return links.sort((a, b) => a.position - b.position);
}

export async function getUserPlan(uid: string): Promise<Plan> {
  const doc = await getAdminDbOrThrow().collection("users").doc(uid).get();
  return doc.data()?.plan === "pro" ? "pro" : "free";
}

// ---- public-profile view recording ----

function deviceFromUA(ua: string): Device {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return "mobile";
  return "desktop";
}

/** Daily-salted, non-reversible visitor hash. Raw IP is never stored (RGPD) —
 *  it is combined with the UA and the day, hashed, then discarded. */
function visitorHash(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.VISITOR_HASH_SALT ?? "";
  return createHash("sha256").update(`${ip}|${ua}|${day}|${salt}`).digest("hex");
}

export interface RequestSignals {
  referer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
}

/** Record a profile view from request headers. Best-effort: never throws into
 *  the render path (a failed analytics write must not break the public page). */
export async function recordProfileView(
  profileId: string,
  headers: RequestSignals,
): Promise<void> {
  try {
    const ua = headers.userAgent ?? "";
    const ip = headers.ip ?? "";
    const referrer = headers.referer && headers.referer.length > 0 ? headers.referer : null;
    await recordView(profileId, referrer, deviceFromUA(ua), visitorHash(ip, ua));
  } catch {
    // swallow — analytics is not allowed to break the page
  }
}

/** Resolve a link click to its destination URL, recording the click along the
 *  way. Returns null when the link is missing/inactive. If the click write
 *  itself fails (e.g. Admin hiccup) we still honor the redirect by reading the
 *  URL directly — a broken analytics write must not break the user's click. */
export async function resolveAndRecordClick(
  linkId: string,
  headers: RequestSignals,
): Promise<string | null> {
  const ua = headers.userAgent ?? "";
  const ip = headers.ip ?? "";
  const referrer = headers.referer && headers.referer.length > 0 ? headers.referer : null;
  try {
    return await recordClick(linkId, referrer, deviceFromUA(ua), visitorHash(ip, ua));
  } catch {
    try {
      const doc = await getAdminDbOrThrow().collection("links").doc(linkId).get();
      const d = doc.data();
      if (doc.exists && d && d.isActive !== false && typeof d.url === "string") {
        return d.url as string;
      }
    } catch {
      // fall through
    }
    return null;
  }
}
