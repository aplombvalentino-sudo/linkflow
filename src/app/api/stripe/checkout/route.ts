// POST /api/stripe/checkout — creates a Stripe Checkout Session for the Pro
// plan and returns its URL for the client to redirect to. Auth-gated via the
// same cryptographic session check used by the dashboard layout (risk #2 from
// the earlier hardening pass — never trust a client-supplied uid).
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/firebase/auth-server";
import { getAdminDbOrThrow } from "@/lib/firebase/admin";
import { getStripeOrThrow, isStripeConfigured } from "@/lib/stripe/admin";
import { checkRateLimit } from "@/lib/firebase/rate-limit";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  PRO_PRICE_CENTS,
  PRO_CURRENCY,
  PRO_PRODUCT_NAME,
  CHECKOUT_LIMIT,
  CHECKOUT_WINDOW_MS,
} from "@/lib/constants";

export const runtime = "nodejs";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const uid = session.uid;

  try {
    await checkRateLimit(`checkout:${uid}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);

    const db = getAdminDbOrThrow();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.data() as
      | { email?: string; plan?: string; stripeCustomerId?: string }
      | undefined;

    if (user?.plan === "pro") {
      return NextResponse.json({ error: "already-pro" }, { status: 400 });
    }

    const stripe = getStripeOrThrow();

    // Reuse the existing Stripe customer if we have one; otherwise create one
    // and persist it now (a second checkout attempt reuses it instead of
    // creating duplicate customers).
    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email ?? session.email,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await userRef.update({ stripeCustomerId: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: uid,
      line_items: [
        {
          price_data: {
            currency: PRO_CURRENCY,
            product_data: { name: PRO_PRODUCT_NAME },
            unit_amount: PRO_PRICE_CENTS,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/dashboard`,
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    logger.error("checkout_session_failed", {
      uid,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "checkout-failed" }, { status: 500 });
  }
}
