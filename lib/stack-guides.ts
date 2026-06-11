/**
 * SHRP-107g — Per-stack credential walkthroughs.
 *
 * Renders inside the client onboarding page (/client-onboard/[token]).
 * Each guide is one card the client expands and follows. We ship three
 * tracks per service: beginner (every click named), intermediate (one
 * paragraph + the URL), expert (just the URL). The client picks their
 * track once on first land and we render the matching one everywhere.
 *
 * v1: top 5 services with beginner track only. Intermediate + expert
 * land in SHRP-108, plus a weekly LLM job that checks each service's
 * docs page and flags drift for review.
 *
 * Voice principle: no jargon, no "developer-speak." Sentences are
 * imperative — "Click X" or "Copy the long string that appears" —
 * not "Locate the credential dropdown menu."
 */

export type GuideStep = {
  title: string;
  /** Plain prose. Renders as a paragraph below the step number. */
  body: string;
  /** Optional deep-link the client can open in a new tab. */
  url?: string;
};

export type GuideTrack = "beginner" | "intermediate" | "expert";

export type StackGuide = {
  service_id: string;
  display_name: string;
  /** One sentence rendered above the steps explaining what the agency wants. */
  what_we_need: string;
  /** Default key_type stored on the credential when accepted. */
  key_type_default: string;
  paste_label: string;
  paste_placeholder: string;
  /** Soft sanity check — if set, the client sees a warning if the paste doesn't match. */
  validate_pattern?: RegExp;
  beginner: GuideStep[];
  intermediate?: GuideStep[];
  expert?: GuideStep[];
};

const STRIPE: StackGuide = {
  service_id: "stripe",
  display_name: "Stripe",
  what_we_need:
    "A restricted Stripe API key so we can build payment features without seeing your full account.",
  key_type_default: "secret_key",
  paste_label: "Paste the secret key",
  paste_placeholder: "sk_live_… or rk_live_… or sk_test_…",
  validate_pattern: /^(sk|rk)_(live|test)_/,
  beginner: [
    {
      title: "Sign in to Stripe",
      body: "Open dashboard.stripe.com in a new tab and sign in with the same email Stripe is registered to.",
      url: "https://dashboard.stripe.com/login",
    },
    {
      title: "Open Developers → API keys",
      body: "In the top-right of the dashboard, click your account name, then 'Developers'. In the left sidebar of the Developers page, click 'API keys'.",
      url: "https://dashboard.stripe.com/apikeys",
    },
    {
      title: "Create a restricted key",
      body: "Scroll down to 'Restricted keys' and click '+ Create restricted key'. Name it 'SherpaKeys – [your agency]'. For permissions, your agency will tell you which scopes — if you don't know, check 'Read' on everything and 'Write' on Customers, Charges, Payment Intents, and Webhooks.",
    },
    {
      title: "Click Create key, then Reveal",
      body: "After you click 'Create key', Stripe shows you the key on a one-time-only screen. Click 'Reveal' and copy the entire string. ⚠️ You can only see this key once — if you click away, you'll have to delete and re-create it.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the key you just copied. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const GITHUB: StackGuide = {
  service_id: "github",
  display_name: "GitHub",
  what_we_need:
    "A fine-grained personal access token so we can read your repository and push the code we build.",
  key_type_default: "access_token",
  paste_label: "Paste the token",
  paste_placeholder: "github_pat_…",
  validate_pattern: /^(github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)/,
  beginner: [
    {
      title: "Sign in to GitHub",
      body: "Open github.com in a new tab and sign in with the same email your GitHub account uses.",
      url: "https://github.com/login",
    },
    {
      title: "Open Settings → Developer settings",
      body: "Click your profile photo in the top-right corner, then 'Settings'. Scroll all the way down in the left sidebar and click 'Developer settings'.",
      url: "https://github.com/settings/profile",
    },
    {
      title: "Go to Personal access tokens → Fine-grained tokens",
      body: "In the left sidebar, expand 'Personal access tokens' and click 'Fine-grained tokens'. Click 'Generate new token' at the top right.",
      url: "https://github.com/settings/personal-access-tokens/new",
    },
    {
      title: "Configure the token",
      body: "Name: 'SherpaKeys – [your agency]'. Expiration: 90 days. Repository access: 'Only select repositories' → pick the one your agency is working on. Repository permissions: ask your agency which scopes — usually Contents (read & write), Pull requests (read & write), and Webhooks (read).",
    },
    {
      title: "Click Generate token",
      body: "GitHub shows the token starting with 'github_pat_…' on a one-time-only screen. Copy the entire string. ⚠️ You can only see this token once — clicking away means starting over.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the token. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const VERCEL: StackGuide = {
  service_id: "vercel",
  display_name: "Vercel",
  what_we_need:
    "A Vercel access token so we can deploy your site and manage your environment variables.",
  key_type_default: "access_token",
  paste_label: "Paste the token",
  paste_placeholder: "Long random string",
  beginner: [
    {
      title: "Sign in to Vercel",
      body: "Open vercel.com in a new tab and sign in with the account that owns the project.",
      url: "https://vercel.com/login",
    },
    {
      title: "Open your Account Settings → Tokens",
      body: "Click your profile photo in the top-right, then 'Account Settings'. In the left sidebar, click 'Tokens'.",
      url: "https://vercel.com/account/tokens",
    },
    {
      title: "Create a new token",
      body: "Click 'Create Token'. Name: 'SherpaKeys – [your agency]'. Scope: pick the specific team or project your agency is working on (not 'Full Account'). Expiration: 90 days.",
    },
    {
      title: "Click Create",
      body: "Vercel shows the token on a one-time-only screen. Copy the entire string. ⚠️ You won't be able to see this again — if you close the dialog, you'll need to make a new one.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the token. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const CLOUDFLARE: StackGuide = {
  service_id: "cloudflare",
  display_name: "Cloudflare",
  what_we_need:
    "A scoped Cloudflare API token so we can manage your DNS and CDN settings without your full account password.",
  key_type_default: "api_token",
  paste_label: "Paste the API token",
  paste_placeholder: "Long random string",
  beginner: [
    {
      title: "Sign in to Cloudflare",
      body: "Open dash.cloudflare.com in a new tab and sign in.",
      url: "https://dash.cloudflare.com/login",
    },
    {
      title: "Open My Profile → API Tokens",
      body: "Click your profile icon in the top-right, then 'My Profile'. In the left sidebar, click 'API Tokens'.",
      url: "https://dash.cloudflare.com/profile/api-tokens",
    },
    {
      title: "Create a custom token",
      body: "Click 'Create Token', then scroll down to 'Custom token' and click 'Get started'. Name: 'SherpaKeys – [your agency]'. Permissions: ask your agency which to grant — usually Zone → DNS → Edit and Zone → Zone → Read. Zone Resources: 'Include → Specific zone' → pick the domain your agency is working on.",
    },
    {
      title: "Continue to summary, then Create Token",
      body: "On the summary page, click 'Create Token'. Cloudflare shows the token on a one-time-only screen. Copy the entire string. ⚠️ This is the only time you'll see it.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the token. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const SUPABASE: StackGuide = {
  service_id: "supabase",
  display_name: "Supabase",
  what_we_need:
    "The service role key for your Supabase project so we can manage your database from our build environment.",
  key_type_default: "service_role_key",
  paste_label: "Paste the service role key",
  paste_placeholder: "Long string starting with eyJ…",
  validate_pattern: /^eyJ/,
  beginner: [
    {
      title: "Sign in to Supabase",
      body: "Open supabase.com/dashboard in a new tab and sign in.",
      url: "https://supabase.com/dashboard",
    },
    {
      title: "Open your project",
      body: "Click the project your agency is working on. If you have several, your agency will tell you which one.",
    },
    {
      title: "Go to Project Settings → API",
      body: "In the left sidebar, click the gear icon ('Project Settings') near the bottom. In the settings sidebar, click 'API'.",
    },
    {
      title: "Reveal the service_role key",
      body: "Scroll to 'Project API keys'. Find the row labeled 'service_role' (not 'anon'). Click 'Reveal' and copy the entire string. ⚠️ This key is sensitive — it bypasses your database security rules.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the key. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const RESEND: StackGuide = {
  service_id: "resend",
  display_name: "Resend",
  what_we_need:
    "A Resend API key so we can send transactional email from your domain (order confirmations, password resets, receipts).",
  key_type_default: "api_key",
  paste_label: "Paste the API key",
  paste_placeholder: "re_…",
  validate_pattern: /^re_/,
  beginner: [
    {
      title: "Sign in to Resend",
      body: "Open resend.com in a new tab and sign in with the email Resend is registered to.",
      url: "https://resend.com/login",
    },
    {
      title: "Open API Keys",
      body: "In the left sidebar, click 'API Keys'. You'll see a list of any keys you've already created.",
      url: "https://resend.com/api-keys",
    },
    {
      title: "Create a new API Key",
      body: "Click 'Create API Key' in the top-right. Name: 'SherpaKeys – [your agency]'. Permission: 'Sending access' (not 'Full access') unless your agency tells you otherwise. Domain: 'All domains' is fine for v1; you can scope later.",
    },
    {
      title: "Click Add",
      body: "Resend shows the API key starting with 're_…' on a one-time-only screen. Copy the entire string. ⚠️ You can only see this key once — if you close the dialog, you'll need to make a new one.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the key. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const OPENAI: StackGuide = {
  service_id: "openai",
  display_name: "OpenAI",
  what_we_need:
    "An OpenAI API key so we can use AI features in your app (product descriptions, search, recommendations).",
  key_type_default: "api_key",
  paste_label: "Paste the API key",
  paste_placeholder: "sk-…",
  validate_pattern: /^sk-/,
  beginner: [
    {
      title: "Sign in to OpenAI",
      body: "Open platform.openai.com in a new tab and sign in. Important: this is the developer platform, not chat.openai.com.",
      url: "https://platform.openai.com/login",
    },
    {
      title: "Open API keys",
      body: "Click your profile icon in the top-right, then 'View API keys'. Or open the dashboard directly — see the link below.",
      url: "https://platform.openai.com/api-keys",
    },
    {
      title: "Create a new secret key",
      body: "Click 'Create new secret key' in the top-right. Name: 'SherpaKeys – [your agency]'. Project: pick the specific project your agency is working on (not 'Default project'). Permissions: 'Restricted' is safer than 'All' — ask your agency which scopes; usually Model capabilities → Read + Write is enough.",
    },
    {
      title: "Click Create secret key",
      body: "OpenAI shows the key starting with 'sk-…' on a one-time-only screen. Copy the entire string. ⚠️ You can only see this once — closing the modal means starting over.",
    },
    {
      title: "Set a usage limit (recommended)",
      body: "Before you close the page, go to Settings → Billing → Usage limits in the left sidebar. Set a monthly hard limit (e.g. $100) so a runaway script can't drain your account. Your agency will tell you the right ceiling.",
      url: "https://platform.openai.com/account/billing/limits",
    },
    {
      title: "Paste the key into the box below",
      body: "Paste the secret key. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const TWILIO: StackGuide = {
  service_id: "twilio",
  display_name: "Twilio",
  what_we_need:
    "A Twilio API key so we can send SMS messages from your account (order updates, two-factor codes, alerts).",
  key_type_default: "api_key",
  paste_label: "Paste the API Key SID + Secret pair",
  paste_placeholder: "SKxxxxxxxx:xxxxxxxxxxxx (SID, colon, Secret)",
  validate_pattern: /^SK[a-f0-9]{32}:.{16,}/i,
  beginner: [
    {
      title: "Sign in to Twilio",
      body: "Open console.twilio.com in a new tab and sign in.",
      url: "https://console.twilio.com/login",
    },
    {
      title: "Open API keys & tokens",
      body: "In the left sidebar, expand 'Account' (your profile icon at the bottom) and click 'API keys & tokens'.",
      url: "https://console.twilio.com/us1/account/keys-credentials/api-keys",
    },
    {
      title: "Create a new API Key",
      body: "Click 'Create API Key' at the top. Friendly name: 'SherpaKeys – [your agency]'. Key type: 'Standard' (not 'Main'). Click 'Create API Key'.",
    },
    {
      title: "Copy BOTH the SID and the Secret",
      body: "Twilio shows you two values on a one-time-only screen: an 'SID' starting with 'SK…' and a 'Secret'. ⚠️ Copy BOTH. The Secret is gone after you click away. Paste them as one string into the box below, separated by a colon — like 'SK123…:abc456…'.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste 'SID:Secret'. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const SENDGRID: StackGuide = {
  service_id: "sendgrid",
  display_name: "SendGrid",
  what_we_need:
    "A SendGrid API key so we can send email from your domain (marketing campaigns, transactional email).",
  key_type_default: "api_key",
  paste_label: "Paste the API key",
  paste_placeholder: "SG.…",
  validate_pattern: /^SG\./,
  beginner: [
    {
      title: "Sign in to SendGrid",
      body: "Open app.sendgrid.com in a new tab and sign in. (SendGrid is owned by Twilio now — same login if you have a Twilio account.)",
      url: "https://app.sendgrid.com/login",
    },
    {
      title: "Open Settings → API Keys",
      body: "In the bottom-left sidebar, click 'Settings', then click 'API Keys' from the submenu.",
      url: "https://app.sendgrid.com/settings/api_keys",
    },
    {
      title: "Create a new API Key",
      body: "Click 'Create API Key' in the top-right. Name: 'SherpaKeys – [your agency]'. Permissions: 'Restricted Access' is safest. Your agency will tell you which scopes — usually Mail Send (full access) + Marketing (read only) is enough for transactional.",
    },
    {
      title: "Click Create & View",
      body: "SendGrid shows the API key starting with 'SG.…' on a one-time-only screen. Copy the entire string. ⚠️ This is the only time you'll see it — clicking 'Done' hides it forever.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the key. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const ANTHROPIC: StackGuide = {
  service_id: "anthropic",
  display_name: "Anthropic",
  what_we_need:
    "An Anthropic API key so we can use Claude in your app (for AI features like content generation, search, customer support).",
  key_type_default: "api_key",
  paste_label: "Paste the API key",
  paste_placeholder: "sk-ant-…",
  validate_pattern: /^sk-ant-/,
  beginner: [
    {
      title: "Sign in to the Anthropic Console",
      body: "Open console.anthropic.com in a new tab and sign in. Important: this is the developer console, not claude.ai.",
      url: "https://console.anthropic.com/login",
    },
    {
      title: "Open API Keys",
      body: "In the left sidebar, click 'API Keys' near the bottom.",
      url: "https://console.anthropic.com/settings/keys",
    },
    {
      title: "Create a new key",
      body: "Click 'Create Key' in the top-right. Name: 'SherpaKeys – [your agency]'. Workspace: pick the specific workspace your agency is working on (or 'Default Workspace' if you only have one). Click 'Create Key'.",
    },
    {
      title: "Copy the key",
      body: "Anthropic shows the key starting with 'sk-ant-…' on a one-time-only screen. Copy the entire string. ⚠️ This is the only time you'll see it — once you close the modal it's gone.",
    },
    {
      title: "Set a usage limit (recommended)",
      body: "Before you close the page, go to Settings → Billing → Usage limits. Set a monthly spend cap (e.g. $100) so a runaway script can't drain your balance. Your agency will tell you the right ceiling.",
      url: "https://console.anthropic.com/settings/limits",
    },
    {
      title: "Paste the key into the box below",
      body: "Paste the key. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const AWS: StackGuide = {
  service_id: "aws",
  display_name: "AWS",
  what_we_need:
    "An AWS access key pair so we can manage your cloud resources — storage buckets, image uploads, file delivery.",
  key_type_default: "access_key_pair",
  paste_label: "Paste the Access Key ID and Secret Access Key, separated by a colon",
  paste_placeholder: "AKIAxxxxxxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  validate_pattern: /^(AKIA|ASIA)[A-Z0-9]{16,}:.{20,}/,
  beginner: [
    {
      title: "Sign in to AWS",
      body: "Open console.aws.amazon.com in a new tab and sign in as the root user (or an IAM user with permission to create keys). If your agency told you which AWS region they're using, switch to it now from the dropdown in the top-right.",
      url: "https://console.aws.amazon.com/",
    },
    {
      title: "Open the IAM service",
      body: "In the top search bar, type 'IAM' and click the result. IAM is where you manage users and access keys.",
      url: "https://console.aws.amazon.com/iam/home",
    },
    {
      title: "Create a new IAM user",
      body: "In the left sidebar click 'Users', then 'Create user' in the top-right. User name: 'sherpakeys-[your agency]'. Check 'Provide user access to the AWS Management Console' OFF — we only need programmatic access. Click 'Next'.",
    },
    {
      title: "Attach the permissions your agency told you to",
      body: "On the permissions screen, pick 'Attach policies directly'. Your agency will tell you which policies — usually 'AmazonS3FullAccess' for storage-only work. If you don't know, pick that one and your agency can scope it down later. Click 'Next', then 'Create user'.",
    },
    {
      title: "Create an access key for the user",
      body: "Click the user you just created. Open the 'Security credentials' tab. Scroll down to 'Access keys' and click 'Create access key'. Choose 'Application running outside AWS', click 'Next', then 'Create access key'.",
    },
    {
      title: "Copy BOTH the Access Key ID and the Secret Access Key",
      body: "AWS shows both values on a one-time-only screen. ⚠️ The Secret is gone once you click 'Done' — there is no way to see it again. Copy both. Paste them as one string into the box below, separated by a colon — like 'AKIA…:xyz…'.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste 'AccessKeyID:SecretAccessKey'. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const GODADDY: StackGuide = {
  service_id: "godaddy",
  display_name: "GoDaddy",
  what_we_need:
    "A GoDaddy API key so we can manage your domain settings (DNS records, renewals, transfer locks).",
  key_type_default: "api_key_pair",
  paste_label: "Paste the API Key and Secret, separated by a colon",
  paste_placeholder: "key:secret",
  beginner: [
    {
      title: "Sign in to GoDaddy",
      body: "Open godaddy.com in a new tab and sign in to the account that owns the domain your agency is working on.",
      url: "https://sso.godaddy.com/",
    },
    {
      title: "Open the API key page",
      body: "Go to developer.godaddy.com/keys (this is the developer portal, not the main GoDaddy site). You may need to sign in again.",
      url: "https://developer.godaddy.com/keys",
    },
    {
      title: "Create a production API Key",
      body: "Click 'Create New API Key' at the top. Name: 'SherpaKeys – [your agency]'. Environment: 'Production' (not 'OTE' — that's a test environment that doesn't touch your real domain). Click 'Next'.",
    },
    {
      title: "Copy BOTH the Key and the Secret",
      body: "GoDaddy shows both values on a one-time-only screen. ⚠️ The Secret is gone once you click away — there's no way to retrieve it later. Copy both. Paste them as one string into the box below, separated by a colon — like 'key:secret'.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste 'Key:Secret'. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const LOOM: StackGuide = {
  service_id: "loom",
  display_name: "Loom",
  what_we_need:
    "A Loom API token so we can embed your video walkthroughs and recordings into the experience your agency is building.",
  key_type_default: "api_token",
  paste_label: "Paste the API token",
  paste_placeholder: "Long random string",
  beginner: [
    {
      title: "Sign in to Loom",
      body: "Open loom.com in a new tab and sign in. You need to be on a Business plan or higher to create API tokens — your agency will let you know if that's a blocker.",
      url: "https://www.loom.com/login",
    },
    {
      title: "Open your Workspace Settings",
      body: "Click your profile photo in the top-right corner, then 'Settings'. In the left sidebar, click 'Developers'.",
      url: "https://www.loom.com/settings/developers",
    },
    {
      title: "Generate a new API token",
      body: "Click 'Generate new token'. Name: 'SherpaKeys – [your agency]'. Expiration: 90 days (you can rotate later). Click 'Generate'.",
    },
    {
      title: "Copy the token",
      body: "Loom shows the token on a one-time-only screen. Copy the entire string. ⚠️ This is the only time you'll see it — clicking 'Done' hides it.",
    },
    {
      title: "Paste it into the box below",
      body: "Paste the token. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const REPLICATE: StackGuide = {
  service_id: "replicate",
  display_name: "Replicate",
  what_we_need:
    "A Replicate API token so we can run AI models in your app (image generation, transcription, custom ML models).",
  key_type_default: "api_token",
  paste_label: "Paste the API token",
  paste_placeholder: "r8_…",
  validate_pattern: /^r8_/,
  beginner: [
    {
      title: "Sign in to Replicate",
      body: "Open replicate.com in a new tab and sign in.",
      url: "https://replicate.com/signin",
    },
    {
      title: "Open API tokens",
      body: "Click your profile photo in the top-right, then 'Account'. In the left sidebar, click 'API tokens'.",
      url: "https://replicate.com/account/api-tokens",
    },
    {
      title: "Create a new token",
      body: "Click 'Create token' in the top-right. Name: 'SherpaKeys – [your agency]'. Click 'Create token'.",
    },
    {
      title: "Copy the token",
      body: "Replicate shows the token starting with 'r8_…' on a one-time-only screen. Copy the entire string. ⚠️ This is the only time you'll see it — once you close the modal it's gone.",
    },
    {
      title: "Set a spend limit (recommended)",
      body: "Before you close the page, go to Account → Billing in the left sidebar. Set a monthly spend cap so a runaway script can't drain your balance. Image and video models can get expensive fast — your agency will tell you the right ceiling.",
      url: "https://replicate.com/account/billing",
    },
    {
      title: "Paste the token into the box below",
      body: "Paste the token. We encrypt it in your browser before it leaves your machine — your agency can read it; we can't.",
    },
  ],
};

const GUIDES: Record<string, StackGuide> = {
  stripe: STRIPE,
  github: GITHUB,
  vercel: VERCEL,
  cloudflare: CLOUDFLARE,
  supabase: SUPABASE,
  resend: RESEND,
  openai: OPENAI,
  twilio: TWILIO,
  sendgrid: SENDGRID,
  anthropic: ANTHROPIC,
  aws: AWS,
  godaddy: GODADDY,
  loom: LOOM,
  replicate: REPLICATE,
};

/**
 * Look up the guide for a given service id. Returns null if we don't
 * have curated content yet — the onboarding page falls back to a
 * service-name-only card with a single paste field.
 */
export function getStackGuide(serviceId: string): StackGuide | null {
  return GUIDES[serviceId.toLowerCase()] ?? null;
}

/** Stack guides we currently ship beginner content for. */
export const GUIDED_SERVICE_IDS = Object.keys(GUIDES);
