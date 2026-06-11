/**
 * SHRP-051 — Stripe rotation adapter (restricted API keys).
 *
 * Stripe supports two flavors of secret key:
 *   - Standard (sk_live_…) — full account access. Stripe doesn't
 *     allow programmatic rotation of these; the dashboard's
 *     "Roll API key" button is the only path. So we don't rotate
 *     standard keys, we use them as the ACTOR.
 *   - Restricted (rk_live_…) — scoped to specific resources +
 *     permissions. POST /v1/api_keys creates them; DELETE revokes.
 *     This is what we rotate.
 *
 * Required setup:
 *   - actorSecret: the agency's standard sk_live_ (or sk_test_).
 *     Used to authenticate the create + delete calls.
 *   - metadata.scope: an array of permission objects matching
 *     Stripe's restricted-key scope shape. The agency provides this
 *     at rotation-policy creation time. Example:
 *       [
 *         { permission_group: "rak_charge_read", resource: "charge" },
 *         { permission_group: "rak_customer_write", resource: "customer" }
 *       ]
 *     Mirrors the JSON Stripe shows in its restricted-key creation UI.
 *
 * NOTE: Stripe's exact API surface for restricted keys has evolved.
 * The endpoints below reflect best understanding; if rotation fails
 * with 4xx errors that look API-shape-related, the surfaced reason
 * from the orchestrator's audit will point us at the right fix.
 */

import type { RotationProvider, ProviderResult } from "./types";

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Tiny helper for form-encoded Stripe requests. Stripe's API is
 * URL-encoded form POSTs, not JSON, with one exception: arrays use
 * bracket notation (scope[0][permission_group]=…).
 */
function encodeForm(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  function walk(prefix: string, value: unknown): void {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(`${prefix}[${i}]`, v));
    } else if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
        walk(prefix ? `${prefix}[${k}]` : k, v),
      );
    } else {
      params.set(prefix, String(value));
    }
  }
  walk("", obj);
  return params.toString();
}

async function stripeRequest(
  path: string,
  args: {
    method: "GET" | "POST" | "DELETE";
    auth: string;
    body?: Record<string, unknown>;
  },
): Promise<{ ok: boolean; status: number; body: unknown; reason?: string }> {
  try {
    const init: RequestInit = {
      method: args.method,
      headers: {
        Authorization: `Bearer ${args.auth}`,
        "Stripe-Version": "2024-06-20",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
    if (args.body && args.method !== "GET") {
      init.body = encodeForm(args.body);
    }
    const res = await fetch(`${STRIPE_API}${path}`, init);
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" && parsed && "error" in parsed
          ? (parsed as { error?: { message?: string } }).error?.message
          : null;
      return {
        ok: false,
        status: res.status,
        body: parsed,
        reason: `stripe_${res.status}${msg ? `: ${msg}` : ""}`,
      };
    }
    return { ok: true, status: res.status, body: parsed };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: null,
      reason: `network: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

export const stripeProvider: RotationProvider = {
  id: "stripe",

  async generateNewKey({ actorSecret, metadata }) {
    const scope = Array.isArray(
      (metadata as { scope?: unknown }).scope,
    )
      ? (metadata as { scope: unknown[] }).scope
      : null;
    if (!scope || scope.length === 0) {
      return {
        ok: false,
        reason:
          "no_scope_configured: rotation_policies.metadata.scope must be an array of Stripe permission objects",
      };
    }
    const name =
      (metadata as { name?: string }).name ?? "SherpaKeys (rotated)";

    const res = await stripeRequest("/api_keys", {
      method: "POST",
      auth: actorSecret,
      body: { type: "restricted", name, scope },
    });
    if (!res.ok) return { ok: false, reason: res.reason ?? "create_failed" };

    const body = res.body as {
      id?: string;
      secret?: string;
      name?: string;
      scope?: unknown[];
    };
    if (!body.id || !body.secret) {
      return {
        ok: false,
        reason: "create_response_missing_id_or_secret",
      };
    }
    return {
      ok: true,
      newKeyId: body.id,
      newSecret: body.secret,
      newMetadata: { name: body.name, scope: body.scope ?? scope },
    };
  },

  async verifyKey(secret) {
    // GET /v1/balance is the cheapest no-side-effect call. Any 2xx
    // confirms the key authenticates.
    const res = await stripeRequest("/balance", {
      method: "GET",
      auth: secret,
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: res.reason ?? "verify_failed" };
  },

  async revokeKey({ actorSecret, keyId }) {
    const res = await stripeRequest(`/api_keys/${keyId}`, {
      method: "DELETE",
      auth: actorSecret,
    });
    if (res.ok) return { ok: true };
    // 404 (already revoked) is success for idempotency.
    if (res.status === 404) return { ok: true };
    return { ok: false, reason: res.reason ?? "revoke_failed" };
  },
};

/**
 * Helper for the v1 onboarding UI — given a Stripe restricted key,
 * use the actor secret to fetch the key's current scopes. We surface
 * the scopes to the agency so they can confirm them before saving
 * the rotation policy.
 *
 * Returns the scopes array shape Stripe accepts on create. Caller is
 * responsible for storing this verbatim in
 * rotation_policies.metadata.scope.
 */
export async function fetchStripeRestrictedKeyScope(args: {
  actorSecret: string;
  keyId: string;
}): Promise<ProviderResult<{ scope: unknown[] }>> {
  const res = await stripeRequest(`/api_keys/${args.keyId}`, {
    method: "GET",
    auth: args.actorSecret,
  });
  if (!res.ok) return { ok: false, reason: res.reason ?? "fetch_failed" };
  const scope = (res.body as { scope?: unknown[] }).scope;
  if (!Array.isArray(scope)) {
    return { ok: false, reason: "response_missing_scope" };
  }
  return { ok: true, scope };
}
