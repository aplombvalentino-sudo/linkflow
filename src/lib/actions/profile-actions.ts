"use server";

// Profile mutations. All are auth-gated (requireUid), ownership-checked
// (loadOwnedProfile), input-validated, and run with the Admin SDK. The client
// calls these directly; they return an ActionResult it can branch on.
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDbOrThrow } from "@/lib/firebase/admin";
import { reserveHandle } from "@/lib/firebase/queries";
import {
  assertHandle,
  assertDisplayName,
  assertBio,
  assertTheme,
  assertIsPublished,
  assertBackgroundStyle,
  assertColor,
  assertImageUrl,
  assertSplineUrl,
} from "@/lib/validation";
import { getUserPlan, getProfilesForUser } from "@/lib/firebase/data";
import { PlanLimitError } from "@/lib/errors";
import {
  FREE_MAX_PROFILES,
  PRO_MAX_PROFILES,
  DEFAULT_BACKGROUND_STYLE,
} from "@/lib/constants";
import { runAction, requireUid, type ActionResult } from "./result";
import { loadOwnedProfile } from "./guards";

/** Create a new profile (Pro users, or a Free user who somehow has none).
 *  Reserves the handle transactionally and creates the profile doc. */
export async function createProfile(input: {
  handle: string;
  displayName?: string;
}): Promise<ActionResult<{ profileId: string }>> {
  return runAction("create_profile", async () => {
    const uid = await requireUid();
    const handle = assertHandle(input.handle);
    const displayName = assertDisplayName(input.displayName);

    const db = getAdminDbOrThrow();
    const [plan, existing] = await Promise.all([getUserPlan(uid), getProfilesForUser(uid)]);
    const limit = plan === "pro" ? PRO_MAX_PROFILES : FREE_MAX_PROFILES;
    if (existing.length >= limit) {
      throw new PlanLimitError(
        plan === "pro"
          ? `You've reached the maximum of ${PRO_MAX_PROFILES} profiles.`
          : "The Free plan includes one profile. Upgrade to Pro for up to 10.",
      );
    }

    // Reserve the handle first so a collision leaves no orphan profile.
    const profileRef = db.collection("profiles").doc();
    await reserveHandle(handle, profileRef.id, uid);
    await profileRef.set({
      userId: uid,
      handle,
      handleLower: handle,
      displayName,
      bio: "",
      avatarUrl: null,
      theme: "volt",
      isPublished: true,
      backgroundStyle: DEFAULT_BACKGROUND_STYLE,
      backgroundImageUrl: null,
      backgroundColor: null,
      backgroundSplineUrl: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/dashboard");
    return { profileId: profileRef.id };
  });
}

export interface ProfilePatch {
  displayName?: string;
  bio?: string;
  theme?: string;
  isPublished?: boolean;
  avatarUrl?: string | null;
  backgroundStyle?: string;
  backgroundImageUrl?: string | null;
  backgroundColor?: string | null;
  backgroundSplineUrl?: string | null;
}

/** Update the editable fields of a profile. Identity fields (handle/userId) are
 *  never touched. Only keys present in `patch` are written. */
export async function updateProfile(
  profileId: string,
  patch: ProfilePatch,
): Promise<ActionResult> {
  return runAction("update_profile", async () => {
    const uid = await requireUid();
    const db = getAdminDbOrThrow();
    const { ref, data } = await loadOwnedProfile(db, profileId, uid);

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (patch.displayName !== undefined) update.displayName = assertDisplayName(patch.displayName);
    if (patch.bio !== undefined) update.bio = assertBio(patch.bio);
    if (patch.theme !== undefined) update.theme = assertTheme(patch.theme, "volt");
    if (patch.isPublished !== undefined) {
      update.isPublished = assertIsPublished(patch.isPublished, true);
    }
    if (patch.avatarUrl !== undefined) update.avatarUrl = assertImageUrl(patch.avatarUrl);
    if (patch.backgroundStyle !== undefined) {
      update.backgroundStyle = assertBackgroundStyle(patch.backgroundStyle, DEFAULT_BACKGROUND_STYLE);
    }
    if (patch.backgroundImageUrl !== undefined) {
      update.backgroundImageUrl = assertImageUrl(patch.backgroundImageUrl);
    }
    if (patch.backgroundColor !== undefined) {
      update.backgroundColor = assertColor(patch.backgroundColor);
    }
    if (patch.backgroundSplineUrl !== undefined) {
      update.backgroundSplineUrl = assertSplineUrl(patch.backgroundSplineUrl);
    }

    // Custom Spline scenes are a Pro feature. Gate on the RESULTING style —
    // either what this patch sets it to, or (if untouched) whatever's already
    // persisted — so editing just the URL on an already-"spline" profile is
    // gated too, not only the initial style switch. Checked at write time only
    // (same pattern as FREE_MAX_PROFILES): a downgrade doesn't retroactively
    // revert an existing profile's background until it's next edited.
    const resultingStyle = update.backgroundStyle ?? data.backgroundStyle ?? DEFAULT_BACKGROUND_STYLE;
    if (resultingStyle === "spline" && (await getUserPlan(uid)) !== "pro") {
      throw new PlanLimitError(
        "Custom Spline backgrounds are a Pro feature. Upgrade to use your own animated scene.",
      );
    }

    await ref.update(update);

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${profileId}`);
    if (data.handleLower) revalidatePath(`/${data.handleLower}`);
    return {};
  });
}

/** Delete a profile, its links, and release its handle — all in one batch. */
export async function deleteProfile(profileId: string): Promise<ActionResult> {
  return runAction("delete_profile", async () => {
    const uid = await requireUid();
    const db = getAdminDbOrThrow();
    const { ref, data } = await loadOwnedProfile(db, profileId, uid);

    const linksSnap = await db.collection("links").where("profileId", "==", profileId).get();
    const batch = db.batch();
    linksSnap.docs.forEach((doc) => batch.delete(doc.ref));
    if (data.handleLower) batch.delete(db.collection("handles").doc(data.handleLower));
    batch.delete(ref);
    await batch.commit();

    revalidatePath("/dashboard");
    if (data.handleLower) revalidatePath(`/${data.handleLower}`);
    return {};
  });
}
