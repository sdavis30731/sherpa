/**
 * Write-action detection — SHRP-042a
 *
 * Determines whether a (service, endpoint, method) tuple is a "read" or
 * "write" operation, used by the MCP server to gate which calls can run
 * autonomously vs. which require user approval.
 *
 * Philosophy: CONSERVATIVE. The default for anything we don't recognize is
 * "write" — i.e. require approval. It's better to over-request approvals
 * than to silently let an agent execute something destructive. We curate
 * the read-list per service; everything else needs approval.
 *
 * To add a new read-safe operation for a service, append to that service's
 * read list. To add a whole new service, add a ServiceReadList entry.
 *
 * Tests live in write-actions.test.ts and must stay green when this file
 * changes.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ReadOperation {
  /** The endpoint name as it appears in sherpa_call_api (e.g. "charges"). */
  endpoint: string;
  /**
   * HTTP method. Some APIs use POST for read-shaped operations (e.g. complex
   * search), so we let services declare exactly which method+endpoint pairs
   * are reads. If method is omitted, ANY method against this endpoint is read.
   */
  method?: HttpMethod;
  /** Short human description used in audit logs and approval cards. */
  description?: string;
}

export interface ServiceReadList {
  service: string;
  reads: ReadOperation[];
}

// ---------------- Stripe ----------------
// Reference: https://docs.stripe.com/api
// Pattern: every GET against a resource is read. Anything that mutates
// (POST/PATCH/DELETE) is write and requires approval.
const STRIPE_READS: ReadOperation[] = [
  { endpoint: "balance", method: "GET", description: "Read account balance" },
  { endpoint: "balance_transactions", method: "GET", description: "List balance transactions" },
  { endpoint: "charges", method: "GET", description: "List or retrieve charges" },
  { endpoint: "customers", method: "GET", description: "List or retrieve customers" },
  { endpoint: "subscriptions", method: "GET", description: "List or retrieve subscriptions" },
  { endpoint: "invoices", method: "GET", description: "List or retrieve invoices" },
  { endpoint: "products", method: "GET", description: "List or retrieve products" },
  { endpoint: "prices", method: "GET", description: "List or retrieve prices" },
  { endpoint: "webhook_endpoints", method: "GET", description: "List webhook endpoints" },
  { endpoint: "events", method: "GET", description: "List recent events" },
  { endpoint: "payment_intents", method: "GET", description: "List or retrieve payment intents" },
  { endpoint: "refunds", method: "GET", description: "List or retrieve refunds (not create)" },
  { endpoint: "payouts", method: "GET", description: "List or retrieve payouts" },
  { endpoint: "disputes", method: "GET", description: "List or retrieve disputes" },
  { endpoint: "accounts", method: "GET", description: "Retrieve account info" },
];

// ---------------- GitHub ----------------
// Reference: https://docs.github.com/en/rest
const GITHUB_READS: ReadOperation[] = [
  { endpoint: "user", method: "GET", description: "Retrieve authenticated user" },
  { endpoint: "repos", method: "GET", description: "List or retrieve repositories" },
  { endpoint: "issues", method: "GET", description: "List or retrieve issues" },
  { endpoint: "pulls", method: "GET", description: "List or retrieve pull requests" },
  { endpoint: "commits", method: "GET", description: "List or retrieve commits" },
  { endpoint: "branches", method: "GET", description: "List or retrieve branches" },
  { endpoint: "workflows", method: "GET", description: "List GitHub Actions workflows" },
  { endpoint: "workflow_runs", method: "GET", description: "List workflow runs" },
  { endpoint: "secrets", method: "GET", description: "List secret names (values not exposed)" },
  { endpoint: "deployments", method: "GET", description: "List deployments" },
];

// ---------------- Supabase ----------------
// We treat Supabase REST as read for GETs. The richer Supabase SDK calls
// (insert/update/delete) get treated as writes when they go through the
// raw API path because they use non-GET methods.
const SUPABASE_READS: ReadOperation[] = [
  { endpoint: "rest", method: "GET", description: "Query data via PostgREST" },
  { endpoint: "auth/v1/admin/users", method: "GET", description: "List or retrieve users" },
  { endpoint: "storage/v1/bucket", method: "GET", description: "List or retrieve buckets" },
  { endpoint: "projects", method: "GET", description: "List or retrieve projects" },
  { endpoint: "functions", method: "GET", description: "List edge functions" },
];

// ---------------- Vercel ----------------
const VERCEL_READS: ReadOperation[] = [
  { endpoint: "user", method: "GET", description: "Retrieve account info" },
  { endpoint: "projects", method: "GET", description: "List or retrieve projects" },
  { endpoint: "deployments", method: "GET", description: "List or retrieve deployments" },
  { endpoint: "env", method: "GET", description: "List environment variables" },
  { endpoint: "domains", method: "GET", description: "List or retrieve domains" },
  { endpoint: "teams", method: "GET", description: "List or retrieve teams" },
  { endpoint: "aliases", method: "GET", description: "List deployment aliases" },
];

// ---------------- OpenAI / Anthropic / Resend / Replicate ----------------
const OPENAI_READS: ReadOperation[] = [
  { endpoint: "models", method: "GET", description: "List available models" },
  { endpoint: "usage", method: "GET", description: "Retrieve usage and spend" },
  { endpoint: "billing", method: "GET", description: "Retrieve billing info" },
  { endpoint: "files", method: "GET", description: "List uploaded files" },
];

const ANTHROPIC_READS: ReadOperation[] = [
  { endpoint: "models", method: "GET", description: "List available models" },
];

const RESEND_READS: ReadOperation[] = [
  { endpoint: "domains", method: "GET", description: "List or retrieve verified domains" },
  { endpoint: "emails", method: "GET", description: "Retrieve email status (not send)" },
  { endpoint: "api-keys", method: "GET", description: "List API key metadata" },
];

const REPLICATE_READS: ReadOperation[] = [
  { endpoint: "models", method: "GET", description: "List or retrieve models" },
  { endpoint: "predictions", method: "GET", description: "List or retrieve predictions" },
];

// ---------------- AWS / Cloudflare ----------------
// These get conservative defaults because their APIs are too varied to fully
// enumerate. List/Describe/Get patterns are read; everything else is write.
const AWS_READS: ReadOperation[] = [
  { endpoint: "list", method: "GET", description: "List resources" },
  { endpoint: "describe", method: "GET", description: "Describe resources" },
  { endpoint: "get", method: "GET", description: "Retrieve a resource" },
];

const CLOUDFLARE_READS: ReadOperation[] = [
  { endpoint: "zones", method: "GET", description: "List or retrieve DNS zones" },
  { endpoint: "dns_records", method: "GET", description: "List DNS records" },
  { endpoint: "user", method: "GET", description: "Retrieve user info" },
  { endpoint: "accounts", method: "GET", description: "List accounts" },
];

export const READ_REGISTRY: ServiceReadList[] = [
  { service: "stripe", reads: STRIPE_READS },
  { service: "github", reads: GITHUB_READS },
  { service: "supabase", reads: SUPABASE_READS },
  { service: "vercel", reads: VERCEL_READS },
  { service: "openai", reads: OPENAI_READS },
  { service: "anthropic", reads: ANTHROPIC_READS },
  { service: "resend", reads: RESEND_READS },
  { service: "replicate", reads: REPLICATE_READS },
  { service: "aws", reads: AWS_READS },
  { service: "cloudflare", reads: CLOUDFLARE_READS },
];

const SERVICE_INDEX: Map<string, ServiceReadList> = new Map(
  READ_REGISTRY.map((s) => [s.service, s]),
);

/**
 * Determine whether the (service, endpoint, method) tuple is a write action
 * that requires user approval. CONSERVATIVE — unknown service or unrecognized
 * endpoint defaults to write.
 *
 * Pure function. Same inputs → same output. Safe to call without DB access.
 */
export function isWriteAction(
  service: string,
  endpoint: string,
  method: string,
): boolean {
  const list = SERVICE_INDEX.get(service);
  if (!list) {
    // We don't know this service. Treat all calls as write to be safe.
    return true;
  }
  const normalizedMethod = method.toUpperCase() as HttpMethod;
  // A read-list entry matches when its endpoint equals OR is a prefix of
  // the requested endpoint, AND (no method declared OR method matches).
  // The prefix match is so e.g. "list" entry covers "list_users", "list_buckets" etc.
  const isRead = list.reads.some((r) => {
    const endpointMatches =
      r.endpoint === endpoint || endpoint.startsWith(`${r.endpoint}/`);
    const methodMatches = !r.method || r.method === normalizedMethod;
    return endpointMatches && methodMatches;
  });
  return !isRead;
}

/**
 * Human-readable summary of an action, for the approval card and audit log.
 * Includes a few params if present so the user can tell at a glance what's
 * about to happen.
 */
export function summarizeAction(
  service: string,
  endpoint: string,
  method: string,
  params?: Record<string, unknown>,
): string {
  const verb = method.toUpperCase();
  const head = `${verb} ${service}/${endpoint}`;
  if (!params || Object.keys(params).length === 0) {
    return head;
  }
  const paramSnippet = Object.entries(params)
    .slice(0, 3)
    .map(([k, v]) => {
      const valStr =
        typeof v === "string"
          ? v.length > 40
            ? v.slice(0, 37) + "..."
            : v
          : typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : JSON.stringify(v).slice(0, 40);
      return `${k}=${valStr}`;
    })
    .join(", ");
  return `${head} (${paramSnippet})`;
}

/**
 * Extract the meaningful "endpoint" name from an API path so we can look
 * it up in the read-registry. Different providers prefix paths differently:
 *
 *   Stripe   /v1/charges                  → "charges"
 *   GitHub   /repos/owner/repo            → "repos"
 *   Supabase /rest/v1/users               → "rest"
 *   Vercel   /v9/projects                 → "projects"
 *   OpenAI   /v1/usage                    → "usage"
 *
 * Heuristic: skip leading slashes, skip version segments (v1, v2, v9, api),
 * take the first remaining segment.
 */
export function extractEndpoint(path: string): string {
  const stripped = path.replace(/^\/+/, "");
  if (!stripped) return "";
  const segments = stripped.split("/");
  for (const seg of segments) {
    if (!seg) continue;
    // Skip common version + api prefix segments.
    if (/^v\d+$/i.test(seg) || seg.toLowerCase() === "api") continue;
    // Strip query strings if any.
    return seg.split("?")[0];
  }
  // Fallback: if the whole path was version segments, return the last one.
  return segments[segments.length - 1].split("?")[0];
}

/**
 * Extract a dollar amount from params if the action looks money-shaped.
 * Useful for surfacing "$48.00" on the approval card without forcing every
 * caller to do parsing. Stripe uses minor units (cents); we convert.
 * Returns cents as integer, or null if no amount detected.
 */
export function extractDollarAmountCents(
  service: string,
  params?: Record<string, unknown>,
): number | null {
  if (!params) return null;
  // Stripe convention: "amount" in cents
  if (service === "stripe" && typeof params.amount === "number") {
    return Math.round(params.amount);
  }
  // Generic "amount_cents" hint
  if (typeof params.amount_cents === "number") {
    return Math.round(params.amount_cents);
  }
  // Generic "amount_usd" if someone passes dollars
  if (typeof params.amount_usd === "number") {
    return Math.round(params.amount_usd * 100);
  }
  return null;
}
