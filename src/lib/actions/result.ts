// Shared plumbing for Server Actions: a discriminated-union result the client
// can branch on, a session guard, and a uniform error→result wrapper. Every
// mutation re-verifies the session server-side (never trusts a client uid) and
// runs with the Admin SDK, so Firestore rules are pure defense-in-depth.
import "server-only";
import { verifySession } from "@/lib/firebase/auth-server";
import { AppError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; message: string };

/** Cryptographically verify the session and return the uid, or throw
 *  UnauthorizedError (mapped to a clean result by runAction). */
export async function requireUid(): Promise<string> {
  const session = await verifySession();
  if (!session) throw new UnauthorizedError();
  return session.uid;
}

/** Run an action body, converting any thrown AppError into a typed failure
 *  result and anything else into a generic one. 5xx-class errors are logged. */
export async function runAction<T extends object>(
  label: string,
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, ...data };
  } catch (err) {
    if (err instanceof AppError) {
      if (err.status >= 500) {
        logger.error(`${label}_failed`, { code: err.code, message: err.message });
      }
      return { ok: false, error: err.code, message: err.message };
    }
    logger.error(`${label}_failed`, {
      message: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: "unexpected", message: "Something went wrong. Try again." };
  }
}
