// POST /api/stripe/webhook — the ONLY place a user's plan is ever upgraded to
// "pro". Verifies the Stripe-Signature header against the RAW request body
// before trusting anything in the payload — an unverified webhook would let
// anyone POST a fake "payment succeeded" event and get free Pro access.
//
// Firestore-side, this is the sole legitimate writer of users/{uid}.plan:
// firestore.rules locks client writes to that doc entirely, and this route
// uses the Admin SDK, which bypasses rules by design.
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripeOrThrow, getWebhookSecret, isStripeConfigured } from "@/lib/stripe/admin";
import { getAdminDbOrThrow } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Exported (not just used internally) so the security-critical plan-sync
// logic is directly unit-testable without mocking NextRequest/NextResponse.
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

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing-signature" }, { status: 400 });
  }

  // MUST be the raw, unparsed body — Stripe signs the exact bytes sent.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripeOrThrow().webhooks.constructEvent(
      rawBody,
      signature,
      getWebhookSecret(),
    );
  } catch (err) {
    logger.warn("webhook_signature_invalid", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        // Unhandled event types are expected and fine to ignore.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("webhook_handler_failed", {
      eventType: event.type,
      message: err instanceof Error ? err.message : String(err),
    });
    // 500 so Stripe retries — a transient Firestore failure shouldn't
    // silently drop a plan-sync event.
    return NextResponse.json({ error: "handler-failed" }, { status: 500 });
  }
}
