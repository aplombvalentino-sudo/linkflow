// Plan-sync handlers for POST /api/stripe/webhook. Split out of route.ts so
// they're directly unit-testable — Next.js route files may only export HTTP
// method handlers + a small set of known config exports; anything else
// (like these) fails webpack's stricter route typegen even though Turbopack
// silently allowed it (the split fixes a real production build gap).
import "server-only";
import type Stripe from "stripe";
import { getAdminDbOrThrow } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const uid = session.client_reference_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!uid || !customerId) {
    logger.warn("checkout_completed_missing_reference", {
      hasUid: !!uid,
      hasCustomer: !!customerId,
    });
    return;
  }
  await getAdminDbOrThrow()
    .collection("users")
    .doc(uid)
    .update({ plan: "pro", stripeCustomerId: customerId });
  logger.info("plan_upgraded", { uid });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;

  const db = getAdminDbOrThrow();
  const snap = await db
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) {
    logger.warn("subscription_deleted_no_matching_user", { customerId });
    return;
  }
  await snap.docs[0].ref.update({ plan: "free" });
  logger.info("plan_downgraded", { uid: snap.docs[0].id });
}
