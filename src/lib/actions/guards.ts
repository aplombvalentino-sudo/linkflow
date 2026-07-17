// Ownership guards shared by profile + link actions. Each loads the target doc
// and asserts the caller owns it, throwing typed NotFound/Forbidden errors that
// runAction turns into clean results. This is the authoritative access check —
// Firestore rules are a second layer, never the only one.
import "server-only";
import type { Firestore, DocumentReference, DocumentData } from "firebase-admin/firestore";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export interface OwnedDoc {
  ref: DocumentReference;
  data: DocumentData;
}

export async function loadOwnedProfile(
  db: Firestore,
  profileId: string,
  uid: string,
): Promise<OwnedDoc> {
  const ref = db.collection("profiles").doc(profileId);
  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("That profile no longer exists.");
  if (snap.data()!.userId !== uid) throw new ForbiddenError();
  return { ref, data: snap.data()! };
}

export async function loadOwnedLink(
  db: Firestore,
  linkId: string,
  uid: string,
): Promise<OwnedDoc> {
  const ref = db.collection("links").doc(linkId);
  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("That link no longer exists.");
  if (snap.data()!.userId !== uid) throw new ForbiddenError();
  return { ref, data: snap.data()! };
}
