/**
 * Key-format detection — SHRP-010
 *
 * Given a pasted credential string, guess the most likely service and key type
 * based on well-known prefixes. The Add Credential dialog uses this to nudge
 * the user when they paste a Stripe key into the Vercel slot, etc.
 *
 * Detection is best-effort and intentionally conservative — when in doubt we
 * return null rather than mis-categorize.
 */

import type { Service } from "./services";

export interface Detection {
  serviceId: string;
  keyTypeId: string;
  /** 0–1 confidence. > 0.9 means a very specific prefix match. */
  confidence: number;
  reason: string;
}

interface Rule {
  serviceId: string;
  keyTypeId: string;
  /** Regex applied to the trimmed input. */
  pattern: RegExp;
  confidence: number;
  reason: string;
}

const RULES: Rule[] = [
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
  { serviceId: "openai", keyTypeId: "api_key", pattern: /^sk-[A-Za-z0-9]{20,}/, confidence: 0.9,
    reason: "OpenAI API key (sk-…)" },
  { serviceId: "openai", keyTypeId: "project_key", pattern: /^sk-proj-[A-Za-z0-9-_]{20,}/, confidence: 0.99,
    reason: "OpenAI project-scoped key (sk-proj-)" },

  // ----- Resend -----
  { serviceId: "resend", keyTypeId: "api_key", pattern: /^re_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Resend API key (re_)" },

  // ----- Replicate -----
  { serviceId: "replicate", keyTypeId: "api_token", pattern: /^r8_[A-Za-z0-9]{20,}/, confidence: 0.99,
    reason: "Replicate API token (r8_)" },

  // ----- AWS -----
  { serviceId: "aws", keyTypeId: "access_key", pattern: /^AKIA[0-9A-Z]{16}$/, confidence: 0.99,
    reason: "AWS access key ID (AKIA…)" },

  // ----- Supabase (heuristic: JWT-shaped, very long) -----
  { serviceId: "supabase", keyTypeId: "anon_key", pattern: /^eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/, confidence: 0.6,
    reason: "Looks like a Supabase JWT — could be anon or service_role" },
];

export function detectKey(input: string): Detection | null {
  const value = input.trim();
  if (value.length < 12) return null;

  // OpenAI project keys are sk-proj-… so prefer the more specific match.
  let best: Detection | null = null;
  for (const rule of RULES) {
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
