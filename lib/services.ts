/**
 * Service catalog — SHRP-009 / SHRP-011
 *
 * The launch-12 services plus a Custom option. Each service has:
 *   - id: stable lowercase key used in the database
 *   - name: human display name
 *   - color: a brand-ish accent color used in the UI
 *   - keyTypes: the kinds of credentials this service issues (used by the
 *     Add Credential dialog and by playbooks)
 *   - rotationDays: recommended rotation interval (used by the rotation tracker)
 *   - dashboardUrl: deep link to where the user manages keys for this service
 */

export type Environment = "dev" | "staging" | "production";

export interface KeyType {
  id: string;
  label: string;
  /** Optional one-line description shown under the choice. */
  hint?: string;
  /** Optional marker for high-risk credentials (e.g. Supabase service_role). */
  dangerous?: boolean;
}

export interface Service {
  id: string;
  name: string;
  color: string; // hex
  keyTypes: KeyType[];
  rotationDays: number;
  dashboardUrl?: string;
}

export const SERVICES: Service[] = [
  {
    id: "stripe",
    name: "Stripe",
    color: "#635BFF",
    rotationDays: 180,
    dashboardUrl: "https://dashboard.stripe.com/apikeys",
    keyTypes: [
      { id: "secret_key", label: "Secret key", hint: "sk_live_… or sk_test_…" },
      { id: "publishable_key", label: "Publishable key", hint: "pk_live_… (safe in frontend)" },
      { id: "webhook_secret", label: "Webhook signing secret", hint: "whsec_…" },
      { id: "restricted_key", label: "Restricted key", hint: "rk_… (least privilege)" },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    color: "#181717",
    rotationDays: 90,
    dashboardUrl: "https://github.com/settings/tokens",
    keyTypes: [
      { id: "fine_grained_pat", label: "Fine-grained PAT", hint: "github_pat_… (recommended)" },
      { id: "classic_pat", label: "Classic PAT", hint: "ghp_… (consider migrating to fine-grained)" },
      { id: "oauth_secret", label: "OAuth app secret" },
      { id: "deploy_key", label: "Deploy key (private SSH key)" },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    color: "#3ECF8E",
    rotationDays: 180,
    dashboardUrl: "https://supabase.com/dashboard/projects",
    keyTypes: [
      { id: "project_url", label: "Project URL" },
      { id: "anon_key", label: "Anon (public) key", hint: "Safe in frontend if RLS is on" },
      { id: "service_role_key", label: "Service role key", hint: "Bypasses RLS — server-side only", dangerous: true },
      { id: "jwt_secret", label: "JWT secret" },
      { id: "db_connection", label: "Database connection string" },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    color: "#000000",
    rotationDays: 180,
    dashboardUrl: "https://vercel.com/dashboard",
    keyTypes: [
      { id: "project_token", label: "Project access token" },
      { id: "team_token", label: "Team access token" },
      { id: "deploy_hook", label: "Deploy hook URL" },
    ],
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    color: "#1BDBDB",
    rotationDays: 365,
    dashboardUrl: "https://dcc.godaddy.com/control/portfolio",
    keyTypes: [
      { id: "api_key", label: "API key + secret" },
      { id: "account_password", label: "Account password" },
      { id: "transfer_code", label: "Domain transfer (EPP) code" },
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    color: "#F38020",
    rotationDays: 180,
    dashboardUrl: "https://dash.cloudflare.com/profile/api-tokens",
    keyTypes: [
      { id: "scoped_token", label: "Scoped API token", hint: "Recommended" },
      { id: "global_key", label: "Global API key", hint: "Avoid — too broad", dangerous: true },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    color: "#000000",
    rotationDays: 180,
    dashboardUrl: "https://resend.com/api-keys",
    keyTypes: [
      { id: "api_key", label: "API key", hint: "re_…" },
      { id: "domain_records", label: "Domain DNS records (SPF/DKIM/DMARC)" },
    ],
  },
  {
    id: "loom",
    name: "Loom",
    color: "#625DF5",
    rotationDays: 365,
    dashboardUrl: "https://www.loom.com/settings/developer",
    keyTypes: [
      { id: "api_key", label: "API key" },
      { id: "oauth_secret", label: "OAuth client secret" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    color: "#10A37F",
    rotationDays: 90,
    dashboardUrl: "https://platform.openai.com/api-keys",
    keyTypes: [
      { id: "api_key", label: "API key", hint: "sk-…" },
      { id: "project_key", label: "Project-scoped key", hint: "Recommended" },
      { id: "org_id", label: "Organization ID" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    color: "#D97757",
    rotationDays: 90,
    dashboardUrl: "https://console.anthropic.com/settings/keys",
    keyTypes: [
      { id: "api_key", label: "API key", hint: "sk-ant-…" },
      { id: "workspace_key", label: "Workspace key" },
    ],
  },
  {
    id: "replicate",
    name: "Replicate",
    color: "#000000",
    rotationDays: 180,
    dashboardUrl: "https://replicate.com/account/api-tokens",
    keyTypes: [{ id: "api_token", label: "API token", hint: "r8_…" }],
  },
  {
    id: "aws",
    name: "AWS",
    color: "#FF9900",
    rotationDays: 90,
    dashboardUrl: "https://console.aws.amazon.com/iam/",
    keyTypes: [
      { id: "access_key", label: "IAM access key + secret access key", hint: "AKIA… + secret", dangerous: true },
      { id: "session_token", label: "Session token (STS)" },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    color: "#64748B",
    rotationDays: 180,
    keyTypes: [
      { id: "api_key", label: "API key" },
      { id: "secret", label: "Secret" },
      { id: "password", label: "Password" },
      { id: "other", label: "Other" },
    ],
  },
];

export const SERVICE_INDEX: Record<string, Service> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s]),
);

export function getService(id: string): Service | undefined {
  return SERVICE_INDEX[id];
}

export function getKeyType(serviceId: string, keyTypeId: string): KeyType | undefined {
  return getService(serviceId)?.keyTypes.find((t) => t.id === keyTypeId);
}

export const ENVIRONMENTS: { id: Environment; label: string; color: string }[] = [
  { id: "production", label: "Production", color: "bg-red-100 text-red-700" },
  { id: "staging", label: "Staging", color: "bg-amber-100 text-amber-700" },
  { id: "dev", label: "Dev", color: "bg-slate-100 text-slate-700" },
];
