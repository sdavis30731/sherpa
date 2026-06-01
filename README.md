# SherpaKeys

**The AI firewall for indie developers.** A zero-knowledge keychain for AI-built
apps, plus an MCP server that lets Claude, Cursor, and Codex use your API keys
without ever seeing them — and gates every write action behind explicit user
approval.

> **"Dude. Where are my keys?!"**
>
> Every founder who shipped a real app by talking to Claude or Cursor has had
> that exact moment of panic. SherpaKeys is the tool you wish you had the
> first time you searched *"is my supabase service_role key supposed to be
> in NEXT_PUBLIC_?"* at 11pm before a launch.

🌐 **Live:** [sherpakeys.com](https://sherpakeys.com)
🔒 **Security architecture:** [SECURITY.md](./SECURITY.md)
📜 **License:** [MIT](./LICENSE)

---

## What this is

SherpaKeys does three things, each useful on its own and far more useful
together:

### 1. A zero-knowledge vault for credentials

Your master passphrase never leaves your device. API keys, webhook secrets,
and connection strings are encrypted in your browser with AES-256-GCM using
a key derived from your passphrase via Argon2id. Our server only ever sees
ciphertext. If our database leaked tomorrow, the attacker would walk away
with a list of email addresses and an unreadable pile of bytes.

### 2. The Go-Live Check

Paste your `.env` and get back: which service every key belongs to, how
dangerous each one is by category, which configurations are misconfigured
(NEXT_PUBLIC_ on a service_role key? sk_live_ in a dev environment?), and
a Go-Live readiness score with a transparent "what we checked / what we
did NOT check" panel. Runs entirely in your browser before signup. No
secrets are uploaded.

### 3. The AI Firewall (MCP server)

The big one. When Claude, Cursor, or Codex needs to call Stripe or Supabase
or GitHub, the agent calls SherpaKeys' MCP server instead. SherpaKeys
decrypts the credential server-side, makes the call, returns the response.
**The model never sees the secret.** And writes — anything not on a small
allow-list of read operations — require explicit human approval via an
email link before they execute.

You get autonomous read-side agents and human-in-the-loop write-side agents,
without leaking credentials into AI transcripts.

---

## Why this exists

AI coding tools have made building real software accessible to people without
a CS degree. But shipping a real app means juggling API keys, webhook
secrets, DNS records, OAuth callbacks, and rotation schedules across a dozen
services. A single `NEXT_PUBLIC_` prefix on the wrong key, an `sk_live_` in
the wrong slot, or an unbounded OpenAI key in a leaked repo turns launch day
into the worst day of the year.

And the next problem is already here: AI agents that can *take action* on
those services. A hallucinated refund. A misunderstood DROP TABLE. A
debugging session that nukes production.

SherpaKeys is the safety layer for both problems. We hold the keys safely.
We help you rotate them. We let agents use them without exposing them. And
we make agents stop and ask before doing anything destructive.

---

## Architecture in 60 seconds

```
                Your browser                    SherpaKeys server          Stripe / etc.

  ┌─────────────────────────────┐     ┌──────────────────────────┐     ┌─────────────┐
  │ passphrase  → Argon2id      │     │                          │     │             │
  │              ↓              │     │ Stores:                  │     │             │
  │           vault key         │     │  • ciphertext            │     │             │
  │              ↓              │ ──→ │  • IV                    │     │             │
  │ secret →  AES-256-GCM →     │     │  • metadata              │     │             │
  │           ciphertext        │     │                          │     │             │
  └─────────────────────────────┘     │ NEVER stores:            │     │             │
                                       │  • passphrase            │     │             │
                                       │  • vault key             │     │             │
                                       │  • plaintext secret      │     │             │
                                       └──────────────────────────┘     │             │
                                                                         │             │
  ┌─────────────────────────────┐     ┌──────────────────────────┐     │             │
  │ Claude (in Cowork)          │     │ MCP server               │     │             │
  │  sherpa_call_api(           │ ──→ │  • Auth via SHA-256 hash │ ──→ │  Live API   │
  │    service: "stripe",       │     │  • Write? → queue + email│     │             │
  │    path: "/v1/customers"    │     │  • Read? → execute now   │     │             │
  │  )                          │     │                          │     │             │
  └─────────────────────────────┘     │ Agent never gets the key │     │             │
                                       └──────────────────────────┘     └─────────────┘
```

For the full story including the agent session key sealing, the
write-action approval flow, the threat model, and the cryptography stack,
read [SECURITY.md](./SECURITY.md).

---

## Tech stack

- **Frontend & backend:** Next.js 15 (App Router) + TypeScript + Tailwind
- **Database & auth:** Supabase (Postgres with RLS on every table)
- **Crypto:** Web Crypto API (browser-native) + `@noble/hashes` for
  Argon2id + `@scure/bip39` for recovery codes
- **Email:** Resend (graceful fallback if not configured)
- **Agent protocol:** Model Context Protocol over HTTP / JSON-RPC 2.0
- **Tests:** Vitest with happy-dom
- **Hosting:** Vercel (auto-deploy from main)

---

## Quick start (self-host)

This is a Next.js app backed by Supabase. To run a private instance:

```bash
# 1. Clone and install
git clone https://github.com/sdavis30731/sherpa.git
cd sherpa
npm install

# 2. Walk through env-var setup
npm run setup
# Prompts for Supabase URL + anon key + service role + site URL,
# writes .env.local, prints the exact Vercel env vars to copy.

# 3. Run the database migrations in Supabase
# Dashboard → SQL Editor → paste each file in order, click Run:
#   supabase/migrations/0001_init.sql
#   supabase/migrations/0002_project_limits.sql
#   supabase/migrations/0003_soft_delete_purge.sql
#   supabase/migrations/0004_project_settings.sql
#   supabase/migrations/0005_agent_sessions.sql
#   supabase/migrations/0006_rate_limit.sql
#   supabase/migrations/0007_write_action_approval.sql
#   supabase/migrations/0008_approval_results.sql

# 4. Dev server
npm run dev
# Open http://localhost:3000

# 5. Tests
npm test
```

### Optional env vars

- `RESEND_API_KEY` and `EMAIL_FROM` — turn on approval email delivery.
  Without these, the approval flow still works; the agent just returns
  the URL inline for the user instead of sending email.
- `AGENT_SESSION_MASTER_KEY` — 32 random bytes (base64-encoded) used to
  seal agent session keys. Generate with `openssl rand -base64 32`.

---

## Repository layout

```
app/
  page.tsx                      Public landing page
  security/page.tsx             Public-facing security overview
  signup/, login/               Magic-link auth
  vault/                        Authenticated vault UI (RLS-scoped)
    setup/, unlock/, recover/
    [projectId]/
      page.tsx                  Project view with grouped credentials
      settings/, audit/, agents/
  approve/[id]/                 AI firewall approval UI (this is the one
                                 users get linked to from email)
  api/
    mcp/v1/route.ts             ★ The MCP server. Auth via Bearer token,
                                  JSON-RPC 2.0, AI firewall lives here.
    mcp-tokens/route.ts         Token creation (defaults permission='read')
    approvals/[id]/
      route.ts                  GET pending_approvals row
      approve/route.ts          POST execute the approved action
      reject/route.ts           POST reject the approval
    agent-sessions/route.ts     Authorize / revoke agent sessions

lib/
  crypto.ts                     ★ Argon2id + AES-256-GCM. The vault math.
  agent-session.ts              ★ Session key sealing/unsealing.
  write-actions.ts              ★ Per-service read-list registry. The
                                  AI firewall's brain.
  risk-rules.ts                 Configuration-misuse rules.
  email.ts                      Resend wrapper (graceful no-key fallback).
  keyDetect.ts                  Key-format detection (Stripe, GitHub, etc.)
  envParser.ts                  .env file parser
  passphrase.ts                 Entropy estimator (zxcvbn replacement)
  recovery.ts                   BIP-39 helpers
  playbooks.ts                  Service playbook registry

content/playbooks/              TSX-based per-service playbooks
supabase/migrations/            DB schema with RLS on every table
```

The stars (★) mark the files most relevant to anyone auditing the
security claims.

---

## Status

This is the v1.1 codebase as of June 2026.

**Shipped:**

- Zero-knowledge vault with Argon2id + AES-256-GCM
- BIP-39 recovery codes
- Per-credential rotation tracking with overdue widget
- Playbook system with Stripe, GitHub, Supabase, Vercel
- `.env` analyzer + Go-Live Readiness Score (no signup)
- Intrinsic risk classification per (service, key type) pair
- Configuration-misuse risk rules
- MCP server: `sherpa_list_services`, `sherpa_rotate`, `sherpa_call_api`,
  `sherpa_get_approval_result`
- Agent session key sealing
- Per-token rate limiting
- Audit log viewer with suspicious-pattern detection
- **AI Firewall: read/write action classification, default-read tokens,
  write-action approval via email + browser UI, dollar caps**

**On the v1.2 roadmap (SHRP-043):**

- Webhook reachability checks (Stripe, Resend)
- DNS hygiene checks (SPF/DKIM/DMARC for sending domains)
- Env-var sync between local `.env` and Vercel/Railway production
- OAuth callback URL validation
- AI provider spend cap detection
- Supabase RLS policy audit on anon-reachable tables
- Active-key status check at the provider

Each one of these will migrate from the "What we did NOT check" column to
the "What we checked" column in the Go-Live readiness panel.

---

## Contributing

PRs welcome, especially for:

- **New playbooks** — `content/playbooks/[service].tsx`. Use Stripe
  (`content/playbooks/stripe.tsx`) as the template.
- **New service support in the MCP server** — `lib/providers.ts` for
  the auth header shape, `lib/write-actions.ts` for the read-list.
- **New risk rules** — `lib/risk-rules.ts`. Each rule is a small object
  with `id`, `severity`, `message`, and `applies()` function.

Things to think about before opening a PR:

- Does this change preserve zero-knowledge? Any new feature that requires
  the server to decrypt user data needs explicit justification in the PR.
- Is this conservative-by-default for the AI firewall? New writes should
  require approval; new reads should be added to the explicit allow-list,
  not bypass the gate.
- Does it have tests? `npm test` runs the suite.

Security issues: see [SECURITY.md](./SECURITY.md) for responsible
disclosure.

---

## License

[MIT](./LICENSE). Use it, fork it, ship it, charge for it. If you build
on this, a link back to SherpaKeys is appreciated but not required.

---

*SherpaKeys is built for the people who shipped a real app the first time
out — with Claude, Cursor, Codex, or Bolt. The credentials OS for the new
generation of indie builders.*
