// Cloudflare Turnstile — SERVER ONLY verification. Never import from a Client
// Component (the secret key lives here, never in NEXT_PUBLIC_*).
import "server-only";
import { TURNSTILE_VERIFY_URL } from "@/lib/constants";
import { logger } from "@/lib/logger";

/** True once the secret key is configured — the authoritative, server-side
 *  gate for whether a route enforces a Turnstile check. Independent of
 *  TURNSTILE_SITE_KEY (client-safe, decides only whether the widget renders)
 *  so a misconfigured pair fails toward "check enforced, no token sent" —
 *  i.e. blocked, not silently skipped. */
export const isTurnstileEnabled = !!process.env.TURNSTILE_SECRET_KEY;

/** Verify a Turnstile token against Cloudflare's siteverify endpoint. Fails
 *  CLOSED (returns false) on any network/parse error or missing secret — a
 *  Cloudflare outage must not become an open door for bots. */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    logger.error("turnstile_verify_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
