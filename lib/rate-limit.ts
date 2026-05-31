/**
 * Per-token rate limiting — SHRP-035
 *
 * Sliding-window counter using the rate_limit_events table. Every MCP
 * request inserts one row; before each request we count rows for the
 * token in the last minute and hour and refuse if either is over limit.
 *
 * Constraints by design:
 *   - 60 requests per minute per token
 *   - 1000 requests per hour per token
 *   - Both limits are simultaneously checked; whichever is hit first wins
 *
 * Tiny race condition at the boundary: two concurrent requests can both
 * pass the check at count=59. For our scale that's harmless. If we ever
 * need exact correctness we'd switch to a single atomic INSERT-and-check
 * statement.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
}

export const DEFAULT_LIMITS: RateLimitConfig = {
  perMinute: 60,
  perHour: 1000,
};

export interface RateLimitDecision {
  allowed: boolean;
  /** Which window, if any, triggered the rejection. */
  window?: "minute" | "hour";
  /** Best-effort seconds until the next request would succeed. */
  retryAfterSec?: number;
  /** Current observed usage in each window (for headers / UI). */
  usage: { perMinute: number; perHour: number };
}

/**
 * Pure function that decides whether a request should be allowed,
 * given observed counts. Easy to unit-test without any database.
 */
export function evaluateRateLimit(
  observed: { perMinute: number; perHour: number },
  limits: RateLimitConfig = DEFAULT_LIMITS,
): RateLimitDecision {
  if (observed.perMinute >= limits.perMinute) {
    return {
      allowed: false,
      window: "minute",
      retryAfterSec: 60,
      usage: observed,
    };
  }
  if (observed.perHour >= limits.perHour) {
    return {
      allowed: false,
      window: "hour",
      retryAfterSec: 3600,
      usage: observed,
    };
  }
  return { allowed: true, usage: observed };
}

/**
 * Check the rate limit for a token. Reads counts from the database but
 * does NOT insert a new row — call `recordRateLimitEvent` separately
 * once you've decided to proceed (typical flow: check, if allowed then
 * record then handle the request).
 */
export async function checkRateLimit(
  tokenId: string,
  limits: RateLimitConfig = DEFAULT_LIMITS,
): Promise<RateLimitDecision> {
  const supabase = createAdminClient();
  const now = Date.now();
  const minAgo = new Date(now - 60_000).toISOString();
  const hourAgo = new Date(now - 3_600_000).toISOString();

  const [minResult, hourResult] = await Promise.all([
    supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("token_id", tokenId)
      .gte("created_at", minAgo),
    supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("token_id", tokenId)
      .gte("created_at", hourAgo),
  ]);

  const perMinute = minResult.count ?? 0;
  const perHour = hourResult.count ?? 0;
  return evaluateRateLimit({ perMinute, perHour }, limits);
}

/**
 * Record that a request was made. Fire and forget — we don't want to
 * fail a successful request just because the rate-limit log entry
 * couldn't be written.
 */
export async function recordRateLimitEvent(tokenId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("rate_limit_events").insert({ token_id: tokenId } as never);
  } catch {
    /* don't propagate */
  }
}
