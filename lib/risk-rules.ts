/**
 * Risk rules registry — SHRP-010c
 *
 * Each rule encodes one thing that's worth warning a vibe coder about
 * when they import a credential. A rule has:
 *   - id: stable identifier (for analytics and tests)
 *   - severity: critical | high | medium | low
 *   - message: a one-line explanation the user actually reads
 *   - playbookSection: where to deep-link if they click "Fix this"
 *   - applies(): pure function deciding whether the rule fires for a given
 *               credential + project context
 *
 * Rules are pure: same input → same output. They never call the network.
 * That keeps the import preview fast and the evaluation deterministic
 * (which matters for the badges shown on existing credentials too).
 */

import type { Section } from "@/lib/playbooks";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export interface RiskCredentialInput {
  /** Service id like "stripe", "supabase", "github" */
  service: string;
  /** Key type id like "service_role_key", "secret_key" */
  keyType: string;
  /** Environment slot the user assigned it to */
  env: "dev" | "staging" | "production";
  /** The raw credential value (so prefix-based rules can inspect it) */
  value: string;
  /** Original .env key name from import (e.g. NEXT_PUBLIC_SUPABASE_URL) */
  envKeyName?: string;
  /** Days since last rotation (or null if never rotated / unknown) */
  daysSinceRotation?: number | null;
}

export interface RiskProjectContext {
  /** All other credentials in the project (so rules can correlate). */
  siblings: RiskCredentialInput[];
}

export interface RiskRule {
  id: string;
  severity: RiskSeverity;
  message: string;
  playbookSection: Section;
  applies(c: RiskCredentialInput, ctx: RiskProjectContext): boolean;
}

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function compareSeverity(a: RiskSeverity, b: RiskSeverity): number {
  return SEVERITY_ORDER[b] - SEVERITY_ORDER[a];
}

// ---------------- rule implementations ----------------

/**
 * R1 — Supabase service_role JWT with a NEXT_PUBLIC_ prefix.
 * This is the worst Sherpa-relevant mistake possible. The service_role
 * key bypasses RLS; the NEXT_PUBLIC_ prefix bundles it into the client JS;
 * anyone visiting the site can read and use it.
 */
const R1_SUPABASE_SERVICE_ROLE_LEAKED: RiskRule = {
  id: "supabase.service_role.next_public",
  severity: "critical",
  message:
    "service_role key with NEXT_PUBLIC_ prefix would be bundled into your client JavaScript — any visitor can read it and bypass RLS.",
  playbookSection: "pitfalls",
  applies: (c) =>
    c.service === "supabase" &&
    c.keyType === "service_role_key" &&
    (c.envKeyName ?? "").startsWith("NEXT_PUBLIC_"),
};

/**
 * R2 — Stripe sk_live in a non-production environment.
 * Test code with a live key moves real money.
 */
const R2_STRIPE_LIVE_IN_DEV: RiskRule = {
  id: "stripe.live_key.non_production",
  severity: "high",
  message:
    "Live Stripe key (sk_live_) in a non-production environment — your test code may charge real cards.",
  playbookSection: "pitfalls",
  applies: (c) =>
    c.service === "stripe" &&
    c.keyType === "secret_key" &&
    c.value.startsWith("sk_live_") &&
    c.env !== "production",
};

/**
 * R3 — Stripe sk_live with a NEXT_PUBLIC_ prefix.
 * Catastrophic — anyone reading the bundle can move money.
 */
const R3_STRIPE_LIVE_NEXT_PUBLIC: RiskRule = {
  id: "stripe.live_key.next_public",
  severity: "critical",
  message:
    "Live Stripe secret key with NEXT_PUBLIC_ prefix — every visitor to your site can use it to move money.",
  playbookSection: "pitfalls",
  applies: (c) =>
    c.service === "stripe" &&
    c.keyType === "secret_key" &&
    c.value.startsWith("sk_live_") &&
    (c.envKeyName ?? "").startsWith("NEXT_PUBLIC_"),
};

/**
 * R4 — Classic GitHub PAT (ghp_). Tokens with no scope visibility.
 * Classic PATs are all-or-nothing for the chosen scopes; the safer pattern
 * is fine-grained PATs.
 */
const R4_GITHUB_CLASSIC_PAT: RiskRule = {
  id: "github.classic_pat",
  severity: "medium",
  message:
    "Classic GitHub PAT (ghp_) — scopes apply to ALL your repositories. Consider migrating to a fine-grained PAT.",
  playbookSection: "scopes",
  applies: (c) => c.service === "github" && c.value.startsWith("ghp_"),
};

/**
 * R5 — OpenAI key without spend-cap context.
 * Heuristic: at import we have no way to know whether they've set caps in
 * the OpenAI dashboard. We surface the reminder so they go check.
 */
const R5_OPENAI_SPEND_CAP_UNKNOWN: RiskRule = {
  id: "openai.spend_cap.unknown",
  severity: "low",
  message:
    "Have you set a hard monthly spend cap on this OpenAI key? A leaked or misused key can rack up costs fast.",
  playbookSection: "pitfalls",
  applies: (c) =>
    c.service === "openai" &&
    (c.keyType === "api_key" || c.keyType === "project_key"),
};

/**
 * R6 — Webhook signing secret stored alongside the corresponding live
 * secret key. This isn't dangerous by itself but means a single breach
 * of the project compromises both ends of the payment flow.
 */
const R6_STRIPE_WEBHOOK_WITH_LIVE_SECRET: RiskRule = {
  id: "stripe.webhook_with_live_secret",
  severity: "low",
  message:
    "Stripe webhook signing secret stored alongside a live secret key — a single project compromise reveals both. Consider separating sensitive Stripe credentials across multiple projects.",
  playbookSection: "pitfalls",
  applies: (c, ctx) =>
    c.service === "stripe" &&
    c.keyType === "webhook_secret" &&
    ctx.siblings.some(
      (s) =>
        s.service === "stripe" &&
        s.keyType === "secret_key" &&
        s.value.startsWith("sk_live_"),
    ),
};

/**
 * R7 — Credential not rotated in over 180 days.
 * Long-lived secrets are likelier to have leaked over time.
 */
const R7_STALE_ROTATION: RiskRule = {
  id: "generic.stale_rotation",
  severity: "low",
  message:
    "This credential hasn't been rotated in over 180 days. Consider rotating as routine hygiene.",
  playbookSection: "rotation",
  applies: (c) =>
    typeof c.daysSinceRotation === "number" && c.daysSinceRotation > 180,
};

/**
 * R8 — Production-pattern credential mapped into the "dev" env slot.
 * Common during import — the user pasted a real key but assigned it to dev
 * by accident. We catch a few patterns and warn.
 */
const R8_PROD_KEY_IN_DEV: RiskRule = {
  id: "generic.prod_key_in_dev_slot",
  severity: "high",
  message:
    "This looks like a production credential, but you assigned it to the 'dev' environment slot. Double-check before importing.",
  playbookSection: "pitfalls",
  applies: (c) => {
    if (c.env !== "dev") return false;
    if (c.value.startsWith("sk_live_")) return true;
    if (c.value.startsWith("pk_live_")) return true;
    if (c.value.startsWith("rk_live_")) return true;
    if (c.value.startsWith("AKIA")) return true; // AWS access keys are typically production-scoped
    return false;
  },
};

export const RISK_RULES: RiskRule[] = [
  R1_SUPABASE_SERVICE_ROLE_LEAKED,
  R2_STRIPE_LIVE_IN_DEV,
  R3_STRIPE_LIVE_NEXT_PUBLIC,
  R4_GITHUB_CLASSIC_PAT,
  R5_OPENAI_SPEND_CAP_UNKNOWN,
  R6_STRIPE_WEBHOOK_WITH_LIVE_SECRET,
  R7_STALE_ROTATION,
  R8_PROD_KEY_IN_DEV,
];

/**
 * Evaluate all rules against a credential. Returns matches sorted by
 * severity (worst first). Pass an empty siblings array when no other
 * credentials exist yet (e.g., the very first row of an import preview).
 */
export function evaluateRisk(
  credential: RiskCredentialInput,
  context: RiskProjectContext = { siblings: [] },
): RiskRule[] {
  return RISK_RULES.filter((r) => r.applies(credential, context)).sort((a, b) =>
    compareSeverity(a.severity, b.severity),
  );
}

/**
 * Return only the worst (or null) risk for compact UI display.
 */
export function worstRisk(
  credential: RiskCredentialInput,
  context: RiskProjectContext = { siblings: [] },
): RiskRule | null {
  return evaluateRisk(credential, context)[0] ?? null;
}
