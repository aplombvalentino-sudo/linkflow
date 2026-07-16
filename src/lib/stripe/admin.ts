// Stripe server SDK — SERVER ONLY. Never import from a Client Component.
// STRIPE_SECRET_KEY is server-only, never NEXT_PUBLIC_. Initialization is
// lazy (touched only on first use, mirrors src/lib/firebase/admin.ts) so
// importing this file in a credential-less build can't crash or read the key.
import "server-only";
import Stripe from "stripe";
import { ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";

let cached: Stripe | undefined;

function initStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured — missing env: STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

/** Lazy accessor with the same guard pattern as getAdminDbOrThrow — a missing
 *  or invalid key becomes a logged, typed ServiceUnavailableError instead of
 *  a raw exception. */
export function getStripeOrThrow(): Stripe {
  if (cached) return cached;
  try {
    cached = initStripe();
    return cached;
  } catch (err) {
    logger.error("stripe_unavailable", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw new ServiceUnavailableError();
  }
}

/** Read + validate the webhook signing secret. Throws a clear error naming
 *  the missing var instead of a cryptic signature-verification failure. */
export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Stripe is not configured — missing env: STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

/** Server-side check for whether billing is wired up at all, so the checkout
 *  route and dashboard can degrade gracefully instead of throwing. */
export function isStripeConfigured(): boolean {
  return (
    !!process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes("sk_test_xxx") &&
    !!process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_WEBHOOK_SECRET !== "whsec_xxx"
  );
}
