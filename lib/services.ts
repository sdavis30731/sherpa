/**
 * Service catalog — SHRP-009 / SHRP-011 / SHRP-041f
 *
 * The launch-12 services plus a Custom option. Each service has:
 *   - id: stable lowercase key used in the database
 *   - name: human display name
 *   - color: a brand-ish accent color used in the UI
 *   - keyTypes: the kinds of credentials this service issues (used by the
 *     Add Credential dialog, by playbooks, and now by the landing-page
 *     analyzer to teach users what each credential ACTUALLY can do)
 *   - rotationDays: recommended rotation interval (used by the rotation tracker)
 *   - dashboardUrl: deep link to where the user manages keys for this service
 *
 * intrinsic risk (SHRP-041f):
 *   Each keyType has a baseline severity that describes what the credential
 *   itself can do if leaked — separate from configuration-misuse rules in
 *   risk-rules.ts (which only fire on specific bad patterns). The analyzer
 *   shows the intrinsic level on every detected row so a clean .env still
 *   educates the user; configuration warnings stack on top.
 */

export type Environment = "dev" | "staging" | "production";

/**
 * Intrinsic severity scale. Slightly broader than RiskRule severities because
 * "info" expresses "public by design — not actually a secret" which is a
 * legitimate fifth state for things like project URLs and publishable keys.
 */
export type IntrinsicLevel = "critical" | "high" | "medium" | "low" | "info";

export interface IntrinsicRisk {
  level: IntrinsicLevel;
  why: string;
}

export interface KeyType {
  id: string;
  label: string;
  /** Optional one-line description shown under the choice. */
  hint?: string;
  /** Optional marker for high-risk credentials (e.g. Supabase service_role). */
  dangerous?: boolean;
  /** Baseline risk this credential carries by virtue of WHAT IT DOES. */
  intrinsic?: IntrinsicRisk;
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
      {
        id: "secret_key",
        label: "Secret key",
        hint: "sk_live_… or sk_test_…",
        intrinsic: {
          level: "high",
          why: "Live payment access — can charge, refund, and transfer real money on your account.",
        },
      },
      {
        id: "publishable_key",
        label: "Publishable key",
        hint: "pk_live_… (safe in frontend)",
        intrinsic: {
          level: "info",
          why: "Public by design — meant to ship in your frontend code.",
        },
      },
      {
        id: "webhook_secret",
        label: "Webhook signing secret",
        hint: "whsec_…",
        intrinsic: {
          level: "medium",
          why: "Verifies webhook authenticity. If leaked, attackers can forge fake Stripe events to your server.",
        },
      },
      {
        id: "restricted_key",
        label: "Restricted key",
        hint: "rk_… (least privilege)",
        intrinsic: {
          level: "medium",
          why: "Scoped to specific permissions — safer than a secret key, but still live access.",
        },
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    color: "#181717",
    rotationDays: 90,
    dashboardUrl: "https://github.com/settings/tokens",
    keyTypes: [
      {
        id: "fine_grained_pat",
        label: "Fine-grained PAT",
        hint: "github_pat_… (recommended)",
        intrinsic: {
          level: "high",
          why: "Repo-scoped access — can read code and trigger deploys on selected repos.",
        },
      },
      {
        id: "classic_pat",
        label: "Classic PAT",
        hint: "ghp_… (consider migrating to fine-grained)",
        intrinsic: {
          level: "high",
          why: "All-or-nothing repo access — could expose your code and deployments.",
        },
      },
      {
        id: "oauth_secret",
        label: "OAuth app secret",
        intrinsic: {
          level: "high",
          why: "Identity-bearing — anyone with this can impersonate your OAuth app.",
        },
      },
      {
        id: "deploy_key",
        label: "Deploy key (private SSH key)",
        intrinsic: {
          level: "high",
          why: "Private SSH key — direct write access to whichever repo it's installed on.",
        },
      },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    color: "#3ECF8E",
    rotationDays: 180,
    dashboardUrl: "https://supabase.com/dashboard/projects",
    keyTypes: [
      {
        id: "project_url",
        label: "Project URL",
        intrinsic: {
          level: "info",
          why: "Not a secret — safe to ship in your frontend.",
        },
      },
      {
        id: "anon_key",
        label: "Anon (public) key",
        hint: "Safe in frontend if RLS is on",
        intrinsic: {
          level: "info",
          why: "Public by design — safe in your frontend if Row Level Security is enforced.",
        },
      },
      {
        id: "service_role_key",
        label: "Service role key",
        hint: "Bypasses RLS — server-side only",
        dangerous: true,
        intrinsic: {
          level: "critical",
          why: "Bypasses Row Level Security — full read/write access to every row in your database.",
        },
      },
      {
        id: "jwt_secret",
        label: "JWT secret",
        intrinsic: {
          level: "critical",
          why: "Signs your auth tokens — anyone with this can impersonate any user in your app.",
        },
      },
      {
        id: "db_connection",
        label: "Database connection string",
        intrinsic: {
          level: "critical",
          why: "Direct database access including credentials — bypass your entire app layer.",
        },
      },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    color: "#000000",
    rotationDays: 180,
    dashboardUrl: "https://vercel.com/dashboard",
    keyTypes: [
      {
        id: "project_token",
        label: "Project access token",
        intrinsic: {
          level: "medium",
          why: "Manages deployments and env vars for one project.",
        },
      },
      {
        id: "team_token",
        label: "Team access token",
        intrinsic: {
          level: "high",
          why: "Manages deployments and env vars across your whole team.",
        },
      },
      {
        id: "deploy_hook",
        label: "Deploy hook URL",
        intrinsic: {
          level: "low",
          why: "URL that triggers a deploy when called — can cause spurious deploys if leaked.",
        },
      },
    ],
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    color: "#1BDBDB",
    rotationDays: 365,
    dashboardUrl: "https://dcc.godaddy.com/control/portfolio",
    keyTypes: [
      {
        id: "api_key",
        label: "API key + secret",
        intrinsic: {
          level: "high",
          why: "Manages DNS, domains, and billing on your account.",
        },
      },
      {
        id: "account_password",
        label: "Account password",
        intrinsic: {
          level: "critical",
          why: "Full account access — domain transfers, billing, everything.",
        },
      },
      {
        id: "transfer_code",
        label: "Domain transfer (EPP) code",
        intrinsic: {
          level: "critical",
          why: "Lets anyone transfer your domain away. Guard this carefully.",
        },
      },
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    color: "#F38020",
    rotationDays: 180,
    dashboardUrl: "https://dash.cloudflare.com/profile/api-tokens",
    keyTypes: [
      {
        id: "scoped_token",
        label: "Scoped API token",
        hint: "Recommended",
        intrinsic: {
          level: "medium",
          why: "Scoped to the specific zones and permissions you configured.",
        },
      },
      {
        id: "global_key",
        label: "Global API key",
        hint: "Avoid — too broad",
        dangerous: true,
        intrinsic: {
          level: "critical",
          why: "Full account access across all your Cloudflare resources.",
        },
      },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    color: "#000000",
    rotationDays: 180,
    dashboardUrl: "https://resend.com/api-keys",
    keyTypes: [
      {
        id: "api_key",
        label: "API key",
        hint: "re_…",
        intrinsic: {
          level: "medium",
          why: "Can send email from your verified domains — phishing/spam abuse risk if leaked.",
        },
      },
      {
        id: "domain_records",
        label: "Domain DNS records (SPF/DKIM/DMARC)",
        intrinsic: {
          level: "info",
          why: "DNS records — public by nature, not a secret.",
        },
      },
    ],
  },
  {
    id: "loom",
    name: "Loom",
    color: "#625DF5",
    rotationDays: 365,
    dashboardUrl: "https://www.loom.com/settings/developer",
    keyTypes: [
      {
        id: "api_key",
        label: "API key",
        intrinsic: {
          level: "low",
          why: "Reads and manages your Loom workspace content.",
        },
      },
      {
        id: "oauth_secret",
        label: "OAuth client secret",
        intrinsic: {
          level: "medium",
          why: "Identity-bearing — can impersonate your OAuth app.",
        },
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    color: "#10A37F",
    rotationDays: 90,
    dashboardUrl: "https://platform.openai.com/api-keys",
    keyTypes: [
      {
        id: "api_key",
        label: "API key",
        hint: "sk-…",
        intrinsic: {
          level: "medium",
          why: "Cost exposure — leaked keys get drained fast by automated scanners.",
        },
      },
      {
        id: "project_key",
        label: "Project-scoped key",
        hint: "Recommended",
        intrinsic: {
          level: "low",
          why: "Spend is bounded by the project's usage limits.",
        },
      },
      {
        id: "org_id",
        label: "Organization ID",
        intrinsic: {
          level: "info",
          why: "Not a secret — identifies your org for API calls.",
        },
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    color: "#D97757",
    rotationDays: 90,
    dashboardUrl: "https://console.anthropic.com/settings/keys",
    keyTypes: [
      {
        id: "api_key",
        label: "API key",
        hint: "sk-ant-…",
        intrinsic: {
          level: "medium",
          why: "Cost exposure — leaked keys get drained fast.",
        },
      },
      {
        id: "workspace_key",
        label: "Workspace key",
        intrinsic: {
          level: "low",
          why: "Spend bounded by the workspace's budget.",
        },
      },
    ],
  },
  {
    id: "replicate",
    name: "Replicate",
    color: "#000000",
    rotationDays: 180,
    dashboardUrl: "https://replicate.com/account/api-tokens",
    keyTypes: [
      {
        id: "api_token",
        label: "API token",
        hint: "r8_…",
        intrinsic: {
          level: "medium",
          why: "Cost exposure — model runs cost money.",
        },
      },
    ],
  },
  {
    id: "aws",
    name: "AWS",
    color: "#FF9900",
    rotationDays: 90,
    dashboardUrl: "https://console.aws.amazon.com/iam/",
    keyTypes: [
      {
        id: "access_key",
        label: "IAM access key + secret access key",
        hint: "AKIA… + secret",
        dangerous: true,
        intrinsic: {
          level: "critical",
          why: "Full access to every AWS service this IAM user can reach — usually a lot.",
        },
      },
      {
        id: "session_token",
        label: "Session token (STS)",
        intrinsic: {
          level: "high",
          why: "Time-limited access from STS — still powerful while valid.",
        },
      },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    color: "#64748B",
    rotationDays: 180,
    keyTypes: [
      {
        id: "api_key",
        label: "API key",
        intrinsic: {
          level: "medium",
          why: "Treat as secret — risk depends on the underlying service.",
        },
      },
      {
        id: "secret",
        label: "Secret",
        intrinsic: {
          level: "medium",
          why: "Treat as secret — risk depends on the underlying service.",
        },
      },
      {
        id: "password",
        label: "Password",
        intrinsic: {
          level: "high",
          why: "Passwords grant the same access as the human account they belong to.",
        },
      },
      {
        id: "other",
        label: "Other",
        intrinsic: {
          level: "medium",
          why: "Unknown sensitivity — treat as secret unless you've verified otherwise.",
        },
      },
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

/**
 * Look up the intrinsic risk metadata for a (service, keyType) pair.
 * Falls back to a generic "treat as secret" for unknown combos so the
 * analyzer never shows a blank row.
 */
export function getIntrinsicRisk(
  serviceId: string,
  keyTypeId: string,
): IntrinsicRisk {
  const kt = getKeyType(serviceId, keyTypeId);
  if (kt?.intrinsic) return kt.intrinsic;
  return {
    level: "medium",
    why: "Treat as secret — risk depends on the underlying service.",
  };
}

export const ENVIRONMENTS: { id: Environment; label: string; color: string }[] = [
  { id: "production", label: "Production", color: "bg-red-100 text-red-700" },
  { id: "staging", label: "Staging", color: "bg-amber-100 text-amber-700" },
  { id: "dev", label: "Dev", color: "bg-slate-100 text-slate-700" },
];
