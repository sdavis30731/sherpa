/**
 * POST /api/checkout/lifetime  (SHRP-045)
 *
 * Creates a Stripe Checkout Session for the $19 Lifetime tier and returns
 * the hosted Checkout URL the client should redirect to.
 *
 * Auth: requires the user to be signed in to SherpaKeys. We need their
 * user_id and email to associate the Stripe customer with the right
 * SherpaKeys account.
 *
 * Response: { url: "https://checkout.stripe.com/..." }
 *   Client should redirect the browser to that URL.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLifetimeCheckoutSession } from "@/lib/stripe";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "https://www.sherpakeys.com"
  );
}

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to upgrade." },
      { status: 401 },
    );
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Your account has no email on file. Re-authenticate first." },
      { status: 400 },
    );
  }

  // Already on Lifetime? Don't charge them again.
  const { data: existingPlanRow } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const existingPlan = (existingPlanRow as { plan?: string } | null)?.plan;
  if (existingPlan === "lifetime" || existingPlan === "pro") {
    return NextResponse.json(
      {
        error: `You're already on the ${existingPlan} plan. Manage your account in vault settings.`,
      },
      { status: 409 },
    );
  }

  const baseUrl = getBaseUrl();
  try {
    const { url } = await createLifetimeCheckoutSession({
      userEmail: user.email,
      userId: user.id,
      successUrl: `${baseUrl}/thanks-for-upgrading?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/?upgrade_canceled=1`,
    });

    // Audit log — we know who tried to upgrade, even before payment
    // completes. The webhook will audit-log the successful upgrade.
    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "lifetime_checkout_started",
      actor: "user",
      metadata: { email: user.email },
    });

    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: `Could not start checkout: ${msg}` },
      { status: 500 },
    );
  }
}
