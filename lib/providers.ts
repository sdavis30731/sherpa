/**
 * API provider catalog — SHRP-032
 *
 * For each supported service, defines:
 *   - base URL: prefixed to the path the agent supplies
 *   - auth header builder: how to inject the credential into outbound calls
 *
 * The MCP `sherpa_call_api` tool uses this catalog to proxy HTTP requests
 * to third-party services on the user's behalf. The agent supplies a
 * credential_id (from sherpa_list_services), a method, a path, and an
 * optional body. Sherpa injects the credential into the outbound request
 * server-side; the agent never sees the secret.
 *
 * Services not in this catalog are rejected. To add a new one, add an
 * entry below and (optionally) document any provider-specific quirks.
 */

export interface Provider {
  /** Base URL prefixed to the path. Trailing slash NOT included. */
  baseUrl: string;
  /** Build the outbound auth headers from the decrypted credential value. */
  buildAuthHeaders: (credentialValue: string) => Record<string, string>;
  /** Optional name to show in error messages. */
  displayName: string;
}

export const PROVIDERS: Record<string, Provider> = {
  stripe: {
    displayName: "Stripe",
    baseUrl: "https://api.stripe.com",
    buildAuthHeaders: (v) => ({ Authorization: `Bearer ${v}` }),
  },
  github: {
    displayName: "GitHub",
    baseUrl: "https://api.github.com",
    buildAuthHeaders: (v) => ({
      Authorization: `Bearer ${v}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }),
  },
  openai: {
    displayName: "OpenAI",
    baseUrl: "https://api.openai.com",
    buildAuthHeaders: (v) => ({ Authorization: `Bearer ${v}` }),
  },
  anthropic: {
    displayName: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    buildAuthHeaders: (v) => ({
      "x-api-key": v,
      "anthropic-version": "2023-06-01",
    }),
  },
  resend: {
    displayName: "Resend",
    baseUrl: "https://api.resend.com",
    buildAuthHeaders: (v) => ({ Authorization: `Bearer ${v}` }),
  },
  cloudflare: {
    displayName: "Cloudflare",
    baseUrl: "https://api.cloudflare.com",
    buildAuthHeaders: (v) => ({ Authorization: `Bearer ${v}` }),
  },
  replicate: {
    displayName: "Replicate",
    baseUrl: "https://api.replicate.com",
    buildAuthHeaders: (v) => ({ Authorization: `Bearer ${v}` }),
  },
};

export function getProvider(serviceId: string): Provider | null {
  return PROVIDERS[serviceId] ?? null;
}
