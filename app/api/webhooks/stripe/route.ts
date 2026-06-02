/**
 * POST /api/webhooks/stripe  (SHRP-045)
 *
 * Stripe → SherpaKeys event destination. Currently handles ONE event:
 *   - `checkout.session.completed`
 * which fires when a customer successfully pays for the Lifetime tier.
 * On that event we flip the user's plan from 'free' to 'lifetime' and
 * record the Stripe customer + payment IDs.
 *
 * Security: every request body is HMAC-verified against
 * STRIPE_WEBHOOK_SECRET via lib/stripe.ts. Reject if signature fails.
 *
 * Idempotency: if the same checkout.session.completed fires twice
 * (Stripe retries on 500s), the second invocation is a no-op because
 * we already set plan='lifetime'.
 *
 * Important: Next.js route handlers need the raw body for signature
 * verification. We read it as a string via request.text() BEFORE
 * parsing JSON.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeSignature } from "@/lib/stripe";

interface CheckoutSessionCompletedObject {
  id: string;
  object: "checkout.session";
  client_reference_id: string | null;
  customer: string | null;
  customer_email: string | null;
  payment_intent: string | null;
  payment_status: string;
  mode: string;
  metadata: Record<string, string> | null;
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    verifyStripeSignature({ rawBody, signatureHeader: signature });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verification failed";
    console.warn("[stripe-webhook] Signature verification failed:", msg);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${msg}` },
      { status: 400 },
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // We only care about checkout.session.completed for now. Any other
  // event types Stripe sends will be acknowledged with 200 so Stripe
  // stops retrying, but we don't do anything with them.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as CheckoutSessionCompletedObject;

  // Defensive: only handle one-time-payment sessions ('payment' mode).
  // Subscription mode will route through this same endpoint when we
  // add Pro billing, but we'd handle it differently.
  if (session.mode !== "payment") {
    return NextResponse.json({
      received: true,
      ignored_mode: session.mode,
    });
  }

  // Stripe sometimes fires this with payment_status='unpaid' if the
  // customer paid via a delayed method (ACH, etc.). For our use case
  // the Lifetime tier is card-only and should always be 'paid' on
  // checkout.session.completed.
  if (session.payment_status !== "paid") {
    console.warn(
      `[stripe-webhook] checkout.session.completed but payment_status=${session.payment_status} for session ${session.id}`,
    );
    return NextResponse.json({ received: true, payment_status_warning: true });
  }

  const userId = session.client_reference_id ?? session.metadata?.sherpa_user_id;
  if (!userId) {
    console.error(
      `[stripe-webhook] No user_id in checkout session ${session.id}. Cannot upgrade anyone.`,
    );
    return NextResponse.json(
      { error: "checkout session missing user reference" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Flip the user to lifetime — idempotent (re-runs do the same thing).
  // Note: public.users does NOT have an email column (email lives in
  // auth.users). We select only id.
  const { data: updated, error: updErr } = await supabase
    .from("users")
    .update({
      plan: "lifetime",
      stripe_customer_id: session.customer ?? undefined,
      stripe_payment_intent_id: session.payment_intent ?? undefined,
      plan_started_at: new Date().toISOString(),
    } as never)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (updErr || !updated) {
    console.error(
      `[stripe-webhook] Failed to upgrade user ${userId} for session ${session.id}:`,
      updErr,
    );
    // Return 500 so Stripe retries. The signature is already verified,
    // so retries are safe.
    return NextResponse.json(
      { error: `Could not upgrade user: ${updErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  await supabase.from("audit_log").insert({
    user_id: userId,
    action: "lifetime_upgrade_completed",
    actor: "system",
    metadata: {
      stripe_session_id: session.id,
      stripe_customer_id: session.customer,
      stripe_payment_intent_id: session.payment_intent,
      stripe_event_id: event.id,
    },
  } as never);

  console.log(
    `[stripe-webhook] Upgraded user ${userId} to lifetime via session ${session.id}`,
  );

  return NextResponse.json({ received: true, upgraded_user_id: userId });
}
