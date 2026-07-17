"use server";

// Link CRUD + reorder. Auth-gated, ownership-checked (via the parent profile or
// the link's denormalized userId), input-validated, Admin SDK. clickCount is
// server-owned and never accepted from the client.
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDbOrThrow } from "@/lib/firebase/admin";
import { assertLinkTitle, assertUrl, assertLinkMeta, assertIsPublished } from "@/lib/validation";
import { PlanLimitError } from "@/lib/errors";
import { MAX_LINKS_PER_PROFILE } from "@/lib/constants";
import { runAction, requireUid, type ActionResult } from "./result";
import { loadOwnedProfile, loadOwnedLink } from "./guards";

/** Revalidate the editor + public pages a link change affects. */
function revalidateFor(profileId: string, handleLower?: string) {
  revalidatePath(`/dashboard/${profileId}`);
  if (handleLower) revalidatePath(`/${handleLower}`);
}

export async function createLink(
  profileId: string,
  input: { title: string; url: string; meta?: string },
): Promise<ActionResult<{ linkId: string; title: string; url: string; meta: string }>> {
  return runAction("create_link", async () => {
    const uid = await requireUid();
    const db = getAdminDbOrThrow();
    const { data: profile } = await loadOwnedProfile(db, profileId, uid);

    const title = assertLinkTitle(input.title);
    const url = assertUrl(input.url);
    const meta = assertLinkMeta(input.meta);

    const existing = await db.collection("links").where("profileId", "==", profileId).get();
    if (existing.size >= MAX_LINKS_PER_PROFILE) {
      throw new PlanLimitError(`A profile can hold up to ${MAX_LINKS_PER_PROFILE} links.`);
    }
    const nextPosition = existing.docs.reduce(
      (max, d) => Math.max(max, typeof d.data().position === "number" ? d.data().position : 0),
      -1,
    ) + 1;

    const linkRef = db.collection("links").doc();
    await linkRef.set({
      profileId,
      userId: uid,
      title,
      url,
      meta,
      thumbnailUrl: null,
      position: nextPosition,
      isActive: true,
      clickCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidateFor(profileId, profile.handleLower);
    // Return the server-normalized values (assertUrl adds https:// + a trailing
    // slash, asserts trim/strip) so the client stores exactly what was persisted
    // instead of the raw input, keeping the live preview faithful pre-refresh.
    return { linkId: linkRef.id, title, url, meta };
  });
}

export async function updateLink(
  linkId: string,
  patch: { title?: string; url?: string; meta?: string; isActive?: boolean },
): Promise<ActionResult<{ title?: string; url?: string; meta?: string; isActive?: boolean }>> {
  return runAction("update_link", async () => {
    const uid = await requireUid();
    const db = getAdminDbOrThrow();
    const { ref, data } = await loadOwnedLink(db, linkId, uid);

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    // Track the normalized values so the client can mirror exactly what landed
    // in Firestore (see createLink) rather than the raw input it sent.
    const applied: { title?: string; url?: string; meta?: string; isActive?: boolean } = {};
    if (patch.title !== undefined) applied.title = update.title = assertLinkTitle(patch.title);
    if (patch.url !== undefined) applied.url = update.url = assertUrl(patch.url);
    if (patch.meta !== undefined) applied.meta = update.meta = assertLinkMeta(patch.meta);
    if (patch.isActive !== undefined) {
      applied.isActive = update.isActive = assertIsPublished(patch.isActive, true);
    }

    await ref.update(update);

    const profileSnap = await db.collection("profiles").doc(data.profileId).get();
    revalidateFor(data.profileId, profileSnap.data()?.handleLower);
    return applied;
  });
}

export async function deleteLink(linkId: string): Promise<ActionResult> {
  return runAction("delete_link", async () => {
    const uid = await requireUid();
    const db = getAdminDbOrThrow();
    const { ref, data } = await loadOwnedLink(db, linkId, uid);
    await ref.delete();

    const profileSnap = await db.collection("profiles").doc(data.profileId).get();
    revalidateFor(data.profileId, profileSnap.data()?.handleLower);
    return {};
  });
}

/** Persist a new link order. Only ids that belong to the profile are touched;
 *  foreign/stale ids are ignored. */
export async function reorderLinks(
  profileId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  return runAction("reorder_links", async () => {
    const uid = await requireUid();
    const db = getAdminDbOrThrow();
    const { data: profile } = await loadOwnedProfile(db, profileId, uid);

    const snap = await db.collection("links").where("profileId", "==", profileId).get();
    const validIds = new Set(snap.docs.map((d) => d.id));

    const batch = db.batch();
    let position = 0;
    for (const id of orderedIds) {
      if (!validIds.has(id)) continue;
      batch.update(db.collection("links").doc(id), {
        position,
        updatedAt: FieldValue.serverTimestamp(),
      });
      position += 1;
    }
    await batch.commit();

    revalidateFor(profileId, profile.handleLower);
    return {};
  });
}
