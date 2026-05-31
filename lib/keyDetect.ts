/**
 * Key-format detection — SHRP-010 / SHRP-041j
 *
 * Given a pasted credential string (and optionally the env-key name it
 * was assigned to), guess the most likely service and key type.
 *
 * We use two ranked signals, in priority order:
 *
 *   1) BY VALUE — well-known prefixes in the credential itself
 *      (sk_live_…, ghp_…, whsec_…, etc.). Highest confidence when it
 *      matches because the prefix is the strongest possible signal.
 *
 *   2) BY ENV KEY NAME — patterns in the variable name from the .env line
 *      (STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, GITHUB_TOKEN, …).
 *      Lower confidence than value-prefix matches, but invaluable when
 *      the user has pasted a redacted .env (where the values are placeholders
 *      but the variable names are intact).
 *
 * If both signals fire, we take the higher-confidence match. If they
 * disagree, the value wins — variable names can be misleading
 * (someone may have pasted the wrong key into the wrong slot), but
 * the prefix is structural.
 *
 * Detection remains best-effort: when in doubt we return null rather
 * than mis-categorize.
 */

import type { Service } from "./services";

export interface Detection {
  serviceId: string;
  keyTypeId: string;
  /** 0–1 confidence. > 0.9 means a very specific prefix match. */
  confidence: number;
  reason: string;
}

interface ValueRule {
  serviceId: string;
  keyTypeId: string;
  /** Regex applied to the trimmed input value. */
  pattern: RegExp;
  confidence: number;
  reason: string;
}

interface NameRule {
  serviceId: string;
  keyTypeId: string;
  /** Regex applied to the UPPER-CASED env-key name. */
  pattern: RegExp;
  confidence: number;
  reason: string;
}

const VALUE_RULES: ValueRule[] = [
  // ----- Stripe -----
  { serviceId: "stripe", keyTypeId: "secret_key", pattern: /^sk_live_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Stripe live secret key (sk_live_)" },
  { serviceId: "stripe", keyTypeId: "secret_key", pattern: /^sk_test_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Stripe test secret key (sk_test_)" },
  { serviceId: "stripe", keyTypeId: "publishable_key", pattern: /^pk_live_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Stripe live publishable key (pk_live_)" },
  { serviceId: "stripe", keyTypeId: "publishable_key", pattern: /^pk_test_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Stripe test publishable key (pk_test_)" },
  { serviceId: "stripe", keyTypeId: "webhook_secret", pattern: /^whsec_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Stripe webhook signing secret (whsec_)" },
  { serviceId: "stripe", keyTypeId: "restricted_key", pattern: /^rk_(live|test)_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Stripe restricted key (rk_)" },

  // ----- GitHub -----
  { serviceId: "github", keyTypeId: "fine_grained_pat", pattern: /^github_pat_[A-Za-z0-9_]{20,}/, confidence: 0.99,
    reason: "GitHub fine-grained PAT (github_pat_)" },
  { serviceId: "github", keyTypeId: "classic_pat", pattern: /^ghp_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "GitHub classic PAT (ghp_)" },
  { serviceId: "github", keyTypeId: "classic_pat", pattern: /^gho_[A-Za-z0-9]{20,}/, confidence: 0.9,
    reason: "GitHub OAuth user token (gho_)" },
  { serviceId: "github", keyTypeId: "oauth_secret", pattern: /^ghs_[A-Za-z0-9]{20,}/, confidence: 0.9,
    reason: "GitHub server-to-server token (ghs_)" },

  // ----- Anthropic -----
  { serviceId: "anthropic", keyTypeId: "api_key", pattern: /^sk-ant-[A-Za-z0-9-]{20,}/, confidence: 0.99,
    reason: "Anthropic API key (sk-ant-)" },

  // ----- OpenAI (must come AFTER anthropic since both start with sk-) -----
  { serviceId: "openai", keyTypeId: "project_key", pattern: /^sk-proj-[A-Za-z0-9-_]{20,}/, confidence: 0.99,
    reason: "OpenAI project-scoped key (sk-proj-)" },
  { serviceId: "openai", keyTypeId: "api_key", pattern: /^sk-[A-Za-z0-9]{20,}/, confidence: 0.9,
    reason: "OpenAI API key (sk-…)" },

  // ----- Resend -----
  { serviceId: "resend", keyTypeId: "api_key", pattern: /^re_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Resend API key (re_)" },

  // ----- Replicate -----
  { serviceId: "replicate", keyTypeId: "api_token", pattern: /^r8_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Replicate API token (r8_)" },

  // ----- AWS -----
  { serviceId: "aws", keyTypeId: "access_key", pattern: /^AKIA[0-9A-Z]{16}$/, confidence: 0.99,
    reason: "AWS access key ID (AKIA…)" },

  // ----- Supabase project URL (value-shaped) -----
  { serviceId: "supabase", keyTypeId: "project_url",
    pattern: /^https?:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i, confidence: 0.99,
    reason: "Supabase project URL" },

  // ----- Supabase JWT (heuristic: 3 dotted segments, eyJ prefix) -----
  { serviceId: "supabase", keyTypeId: "anon_key",
    pattern: /^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/, confidence: 0.6,
    reason: "Looks like a Supabase JWT — could be anon or service_role" },
];

/**
 * By-name fallback rules. Tested against the env-key name (e.g.
 * "STRIPE_SECRET_KEY"). Confidence is intentionally lower than value
 * prefixes so a value-prefix match always wins when both apply.
 *
 * Order matters within a service: most specific patterns first.
 */
const NAME_RULES: NameRule[] = [
  // ----- Stripe -----
  { serviceId: "stripe", keyTypeId: "webhook_secret", pattern: /STRIPE.*WEBHOOK/, confidence: 0.7,
    reason: "Env-key name suggests Stripe webhook signing secret" },
  { serviceId: "stripe", keyTypeId: "publishable_key", pattern: /STRIPE.*PUBLISH/, confidence: 0.7,
    reason: "Env-key name suggests Stripe publishable key" },
  { serviceId: "stripe", keyTypeId: "restricted_key", pattern: /STRIPE.*RESTRICTED/, confidence: 0.7,
    reason: "Env-key name suggests Stripe restricted key" },
  { serviceId: "stripe", keyTypeId: "secret_key", pattern: /STRIPE.*(SECRET|SK)/, confidence: 0.7,
    reason: "Env-key name suggests Stripe secret key" },
  { serviceId: "stripe", keyTypeId: "secret_key", pattern: /^STRIPE_(API_)?KEY$/, confidence: 0.6,
    reason: "Env-key name suggests Stripe (assuming secret key)" },

  // ----- Supabase -----
  { serviceId: "supabase", keyTypeId: "service_role_key", pattern: /SUPABASE.*SERVICE.*ROLE/, confidence: 0.85,
    reason: "Env-key name says Supabase service_role" },
  { serviceId: "supabase", keyTypeId: "jwt_secret", pattern: /SUPABASE.*JWT/, confidence: 0.8,
    reason: "Env-key name suggests Supabase JWT secret" },
  { serviceId: "supabase", keyTypeId: "db_connection", pattern: /SUPABASE.*(DB|DATABASE)/, confidence: 0.7,
    reason: "Env-key name suggests Supabase database connection" },
  { serviceId: "supabase", keyTypeId: "project_url", pattern: /SUPABASE.*URL/, confidence: 0.8,
    reason: "Env-key name suggests Supabase project URL" },
  { serviceId: "supabase", keyTypeId: "anon_key", pattern: /SUPABASE.*(ANON|PUBLIC)/, confidence: 0.8,
    reason: "Env-key name suggests Supabase anon (public) key" },
  { serviceId: "supabase", keyTypeId: "anon_key", pattern: /SUPABASE.*KEY/, confidence: 0.5,
    reason: "Env-key name suggests Supabase (defaulting to anon)" },

  // ----- GitHub -----
  { serviceId: "github", keyTypeId: "fine_grained_pat", pattern: /GITHUB.*FINE/, confidence: 0.8,
    reason: "Env-key name suggests GitHub fine-grained PAT" },
  { serviceId: "github", keyTypeId: "classic_pat", pattern: /GITHUB.*(TOKEN|PAT)/, confidence: 0.7,
    reason: "Env-key name suggests GitHub token" },
  { serviceId: "github", keyTypeId: "oauth_secret", pattern: /GITHUB.*OAUTH/, confidence: 0.7,
    reason: "Env-key name suggests GitHub OAuth secret" },

  // ----- OpenAI / Anthropic / Replicate -----
  { serviceId: "openai", keyTypeId: "api_key", pattern: /OPENAI.*(KEY|TOKEN)/, confidence: 0.7,
    reason: "Env-key name suggests OpenAI" },
  { serviceId: "anthropic", keyTypeId: "api_key", pattern: /ANTHROPIC.*(KEY|TOKEN)/, confidence: 0.7,
    reason: "Env-key name suggests Anthropic" },
  { serviceId: "replicate", keyTypeId: "api_token", pattern: /REPLICATE.*(TOKEN|KEY)/, confidence: 0.7,
    reason: "Env-key name suggests Replicate" },

  // ----- Resend -----
  { serviceId: "resend", keyTypeId: "api_key", pattern: /RESEND.*(KEY|TOKEN|API)/, confidence: 0.7,
    reason: "Env-key name suggests Resend" },

  // ----- Vercel -----
  { serviceId: "vercel", keyTypeId: "team_token", pattern: /VERCEL.*TEAM/, confidence: 0.7,
    reason: "Env-key name suggests Vercel team token" },
  { serviceId: "vercel", keyTypeId: "deploy_hook", pattern: /VERCEL.*(DEPLOY|HOOK)/, confidence: 0.7,
    reason: "Env-key name suggests Vercel deploy hook" },
  { serviceId: "vercel", keyTypeId: "project_token", pattern: /VERCEL.*(TOKEN|KEY)/, confidence: 0.7,
    reason: "Env-key name suggests Vercel project token" },

  // ----- Cloudflare -----
  { serviceId: "cloudflare", keyTypeId: "global_key", pattern: /CLOUDFLARE.*GLOBAL/, confidence: 0.8,
    reason: "Env-key name suggests Cloudflare global key" },
  { serviceId: "cloudflare", keyTypeId: "scoped_token", pattern: /CLOUDFLARE.*(TOKEN|KEY)/, confidence: 0.7,
    reason: "Env-key name suggests Cloudflare scoped token" },

  // ----- AWS -----
  { serviceId: "aws", keyTypeId: "access_key", pattern: /AWS.*(ACCESS.*KEY|SECRET.*KEY)/, confidence: 0.7,
    reason: "Env-key name suggests AWS IAM access key" },
  { serviceId: "aws", keyTypeId: "session_token", pattern: /AWS.*SESSION/, confidence: 0.7,
    reason: "Env-key name suggests AWS session token" },

  // ----- GoDaddy / Loom -----
  { serviceId: "godaddy", keyTypeId: "api_key", pattern: /GODADDY.*(KEY|API)/, confidence: 0.7,
    reason: "Env-key name suggests GoDaddy API key" },
  { serviceId: "loom", keyTypeId: "api_key", pattern: /LOOM.*(KEY|TOKEN)/, confidence: 0.6,
    reason: "Env-key name suggests Loom API key" },
];

export function detectKey(input: string, envKeyName?: string): Detection | null {
  const value = input.trim();

  // 1) Try value-prefix detection first (highest signal).
  let best: Detection | null = null;
  if (value.length >= 12) {
    for (const rule of VALUE_RULES) {
      if (rule.pattern.test(value)) {
        if (!best || rule.confidence > best.confidence) {
          best = {
            serviceId: rule.serviceId,
            keyTypeId: rule.keyTypeId,
            confidence: rule.confidence,
            reason: rule.reason,
          };
        }
      }
    }
  }

  // Special-case Supabase JWT: when the JWT pattern matched (low-confidence
  // anon by default), let an env-key-name signal upgrade or override the
  // keyType. "SERVICE_ROLE" in the name → service_role_key (critical); a
  // name containing "ANON" or "PUBLIC" leaves it as anon_key.
  if (
    best?.serviceId === "supabase" &&
    best.keyTypeId === "anon_key" &&
    envKeyName
  ) {
    const upper = envKeyName.toUpperCase();
    if (/SERVICE.*ROLE/.test(upper)) {
      best = {
        ...best,
        keyTypeId: "service_role_key",
        confidence: 0.95,
        reason: "Supabase JWT + env-key name says service_role",
      };
    }
  }

  // 2) Fall back to env-key-name detection if value gave us nothing — OR if
  //    the by-name match is more confident (e.g. supabase JWT at 0.6
  //    vs. STRIPE_SECRET_KEY at 0.7 would still let JWT win because
  //    different service... we only consider name rules if value missed
  //    or if the name's match is for the SAME service with HIGHER
  //    confidence on the keyType).
  if (envKeyName) {
    const upper = envKeyName.toUpperCase();
    for (const rule of NAME_RULES) {
      if (rule.pattern.test(upper)) {
        if (!best) {
          best = {
            serviceId: rule.serviceId,
            keyTypeId: rule.keyTypeId,
            confidence: rule.confidence,
            reason: rule.reason,
          };
        } else if (
          best.serviceId === rule.serviceId &&
          rule.confidence > best.confidence
        ) {
          // Same-service refinement — keep service, upgrade keyType.
          best = {
            serviceId: rule.serviceId,
            keyTypeId: rule.keyTypeId,
            confidence: rule.confidence,
            reason: rule.reason,
          };
        }
      }
    }
  }

  return best;
}

/**
 * Convenience: given a service the user has picked and a paste, return a
 * mismatch warning if the input looks like it belongs to a DIFFERENT service.
 */
export function detectMismatch(
  pastedValue: string,
  pickedService: Pick<Service, "id">,
): Detection | null {
  const d = detectKey(pastedValue);
  if (!d) return null;
  if (d.serviceId === pickedService.id) return null;
  return d;
}
