// Server-side session helpers. This is the AUTHORITATIVE auth boundary (risk #2):
// verifySession() cryptographically verifies the Firebase session cookie via the
// Admin SDK, so a forged or expired cookie that slips past the Edge middleware's
// cheap presence check is still rejected here.
import "server-only";
import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

/** Verify the session cookie cryptographically. Returns the decoded token, or
 *  null if absent/invalid/expired/revoked. `checkRevoked = true` also rejects
 *  users whose sessions were revoked or accounts disabled. */
export async function verifySession(): Promise<DecodedIdToken | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    return await getAdminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

/** Mint a session cookie from a freshly-issued Firebase ID token. */
export async function mintSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
}
