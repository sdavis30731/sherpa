/**
 * POST /api/checkout/lifetime  (SHRP-045 / SHRP-054)
 *
 * Status: paused. Stripe Lifetime checkout is temporarily disabled while
 * SherpaKeys' legal entity (LLC) is being formed via Stripe Atlas. Until
 * the new SherpaKeys-owned Stripe account replaces the EcoVerse-owned
 * account currently wired in this codebase, no Lifetime purchases should
 * be accepted — every $19 would route to the wrong bank account.
 *
 * Once SherpaKeys' Stripe is live, revert this file to the SHRP-045
 * implementation (git log will show the prior contents) and update the
 * Vercel env vars (STRIPE_SECRET_KEY, STRIPE_PRICE_ID_LIFETIME,
 * STRIPE_WEBHOOK_SECRET) to the new account's values.
 */

import { NextResponse, type NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        "Lifetime upgrade is paused while we finalize SherpaKeys' business setup. Join the early-access list at /pro-waitlist?tier=lifetime and we'll email you when it's live.",
      paused: true,
    },
    { status: 503 },
  );
}
