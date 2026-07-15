// Server-side session helpers. This is the AUTHORITATIVE auth boundary (risk #2):
// verifySession() cryptographically verifies the Firebase session cookie via the
// Admin SDK, so a forged or expired cookie that slips past the Edge middleware's
// cheap presence check is still rejected here.
import "server-only";
import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Verify the session cookie cryptographically. Returns the decoded token, or
 *  null if absent/invalid/expired/revoked. `checkRevoked = true` also rejects
 *  users whose sessions were revoked or accounts disabled. Any failure (invalid
 *  cookie OR an Admin-SDK misconfiguration) is logged for debugging before we
 *  return null (risk #7). */
export async function verifySession(): Promise<DecodedIdToken | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    return await getAdminAuth().verifySessionCookie(cookie, true);
  } catch (err) {
    logger.warn("session_verification_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Mint a session cookie from a freshly-issued Firebase ID token. Wraps the
 *  Admin call so a misconfigured/unavailable Admin SDK surfaces as a logged,
 *  typed ServiceUnavailableError (503) rather than a raw exception (risk #6). */
export async function mintSessionCookie(idToken: string): Promise<string> {
  try {
    return await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });
  } catch (err) {
    logger.error("session_cookie_mint_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw new ServiceUnavailableError("Could not create a session. Try again.");
  }
}
