/**
 * Stripe API helpers — SHRP-045
 *
 * Minimal direct-fetch wrapper around the Stripe REST API. We deliberately
 * don't pull in the `stripe` npm package — the two operations we need
 * (create a Checkout Session, verify a webhook signature) are small enough
 * to do directly, and we avoid an extra dependency.
 *
 * Reads env vars at call time so missing keys throw a clear error rather
 * than failing silently or breaking the whole route module.
 */

import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to your Vercel project's Environment Variables and redeploy.`,
    );
  }
  return value;
}

/**
 * Create a Stripe Checkout Session for a one-time payment.
 *
 * Returns the Checkout URL the caller should redirect to. Stripe handles
 * card collection, 3DS, receipts. We just need the URL.
 */
export async function createLifetimeCheckoutSession(args: {
  userEmail: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  const priceId = requireEnv("STRIPE_PRICE_ID_LIFETIME");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", args.successUrl);
  params.set("cancel_url", args.cancelUrl);
  params.set("customer_email", args.userEmail);
  // Stash the SherpaKeys user_id in client_reference_id so the webhook
  // can look up which user just upgraded.
  params.set("client_reference_id", args.userId);
  // Also send it in metadata as a belt-and-suspenders measure.
  params.set("metadata[sherpa_user_id]", args.userId);
  params.set("metadata[sherpa_plan]", "lifetime");
  // Enforce one customer per email so repeat purchases don't accidentally
  // create duplicate Stripe customers.
  params.set("customer_creation", "always");

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-12-18.acacia",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Stripe checkout session creation failed: ${errText}`);
  }

  const body = (await response.json()) as { id?: string; url?: string };
  if (!body.url || !body.id) {
    throw new Error("Stripe returned a Checkout Session with no URL or ID");
  }
  return { url: body.url, sessionId: body.id };
}

/**
 * Verify a Stripe webhook signature against the raw request body.
 *
 * Stripe's signing format: `t=<timestamp>,v1=<signature>`. We compute
 * HMAC-SHA256 of `<timestamp>.<rawBody>` using the signing secret, then
 * timing-safe-compare against the v1 value.
 *
 * Throws on invalid signature, expired timestamp (>5 min skew), or
 * malformed header. Returns nothing on success.
 */
export function verifyStripeSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  toleranceSeconds?: number;
}): void {
  const signingSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const tolerance = args.toleranceSeconds ?? 300; // 5 minutes

  if (!args.signatureHeader) {
    throw new Error("Missing Stripe-Signature header");
  }

  // Parse the header — comma-separated list of k=v pairs.
  const parts = new Map<string, string[]>();
  for (const piece of args.signatureHeader.split(",")) {
    const eqIdx = piece.indexOf("=");
    if (eqIdx === -1) continue;
    const k = piece.slice(0, eqIdx).trim();
    const v = piece.slice(eqIdx + 1).trim();
    const existing = parts.get(k) ?? [];
    existing.push(v);
    parts.set(k, existing);
  }
  const timestamp = parts.get("t")?.[0];
  const signatures = parts.get("v1") ?? [];
  if (!timestamp || signatures.length === 0) {
    throw new Error("Malformed Stripe-Signature header");
  }

  // Reject events older than `tolerance` seconds — defends against replay.
  const tsInt = Number.parseInt(timestamp, 10);
  if (Number.isNaN(tsInt)) {
    throw new Error("Malformed Stripe-Signature timestamp");
  }
  const ageSec = Math.floor(Date.now() / 1000) - tsInt;
  if (ageSec > tolerance) {
    throw new Error(`Stripe-Signature timestamp too old (${ageSec}s)`);
  }

  // Compute expected HMAC-SHA256 hex.
  const signedPayload = `${timestamp}.${args.rawBody}`;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time compare against each v1 signature Stripe sent.
  // (Stripe may send multiple signatures during key rotation.)
  const expectedBuf = Buffer.from(expected, "hex");
  const matches = signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "hex");
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
  if (!matches) {
    throw new Error("Stripe-Signature does not match expected HMAC");
  }
}
