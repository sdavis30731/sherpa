/**
 * Provider adapters — per-service auth-header shape and base URL.
 *
 * Each provider knows how to inject the credential into an outbound HTTP
 * request. The provider NEVER sees the AI agent's prompt or model. It
 * only sees the validated tool call (service + path + method + params).
 *
 * v0.1 ships with Stripe + GitHub. v0.2 adds OpenAI + Anthropic.
 *
 * The read-only allow-list defines which HTTP methods + path patterns are
 * considered "reads" — anything outside the allow-list is a "write" and
 * (in v0.1) is refused with a clear "write approval requires hosted
 * SherpaKeys — coming in v0.2" message.
 */

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  /** Build the HTTP auth headers for an outbound call. */
  buildAuthHeaders(credentialValue: string): Record<string, string>;
  /** Conservative read-only allow-list. Anything outside is a "write". */
  readPatterns: ReadPattern[];
}

export interface ReadPattern {
  method: "GET" | "HEAD" | "OPTIONS";
  /** Path glob — supports `*` as a single-segment wildcard. */
  path: string;
}

const PROVIDERS: Record<string, Provider> = {
  stripe: {
    id: "stripe",
    name: "Stripe",
    baseUrl: "https://api.stripe.com",
    buildAuthHeaders(credentialValue) {
      return {
        Authorization: `Bearer ${credentialValue}`,
      };
    },
    readPatterns: [
      { method: "GET", path: "/v1/customers" },
      { method: "GET", path: "/v1/customers/*" },
      { method: "GET", path: "/v1/charges" },
      { method: "GET", path: "/v1/charges/*" },
      { method: "GET", path: "/v1/payment_intents" },
      { method: "GET", path: "/v1/payment_intents/*" },
      { method: "GET", path: "/v1/subscriptions" },
      { method: "GET", path: "/v1/subscriptions/*" },
      { method: "GET", path: "/v1/invoices" },
      { method: "GET", path: "/v1/invoices/*" },
      { method: "GET", path: "/v1/products" },
      { method: "GET", path: "/v1/products/*" },
      { method: "GET", path: "/v1/prices" },
      { method: "GET", path: "/v1/prices/*" },
      { method: "GET", path: "/v1/balance" },
      { method: "GET", path: "/v1/events" },
      { method: "GET", path: "/v1/events/*" },
    ],
  },
  github: {
    id: "github",
    name: "GitHub",
    baseUrl: "https://api.github.com",
    buildAuthHeaders(credentialValue) {
      return {
        Authorization: `Bearer ${credentialValue}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
    },
    readPatterns: [
      { method: "GET", path: "/user" },
      { method: "GET", path: "/user/repos" },
      { method: "GET", path: "/repos/*/*" },
      { method: "GET", path: "/repos/*/*/issues" },
      { method: "GET", path: "/repos/*/*/issues/*" },
      { method: "GET", path: "/repos/*/*/pulls" },
      { method: "GET", path: "/repos/*/*/pulls/*" },
      { method: "GET", path: "/repos/*/*/commits" },
      { method: "GET", path: "/repos/*/*/commits/*" },
      { method: "GET", path: "/repos/*/*/contents/*" },
      { method: "GET", path: "/orgs/*" },
      { method: "GET", path: "/orgs/*/repos" },
      { method: "GET", path: "/orgs/*/members" },
    ],
  },
};

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS[id.toLowerCase()];
}

export function listProviders(): Provider[] {
  return Object.values(PROVIDERS);
}

/**
 * Test whether a (method, path) combo matches a glob pattern. Patterns
 * use `*` as a single-segment wildcard (does not cross `/`).
 *
 * Examples:
 *   "/v1/customers/*"       matches "/v1/customers/cus_abc"
 *   "/repos/* /* /issues"   matches "/repos/sdavis30731/sherpa/issues"
 *
 * Multi-segment globs (`**`) are deliberately not supported — the v0.1
 * allow-list is intentionally conservative.
 */
export function matchesPattern(
  method: string,
  path: string,
  pattern: ReadPattern,
): boolean {
  if (method.toUpperCase() !== pattern.method) return false;
  const requestSegs = path.split("?")[0].split("/");
  const patternSegs = pattern.path.split("/");
  if (requestSegs.length !== patternSegs.length) return false;
  for (let i = 0; i < patternSegs.length; i++) {
    if (patternSegs[i] === "*") continue;
    if (patternSegs[i] !== requestSegs[i]) return false;
  }
  return true;
}

/**
 * Classify a request as "read" (matches allow-list) or "write" (does not).
 */
export function isReadOnly(
  provider: Provider,
  method: string,
  path: string,
): boolean {
  return provider.readPatterns.some((p) => matchesPattern(method, path, p));
}
