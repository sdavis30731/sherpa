# Sherpa

The keychain for vibe coders. One safe place for every API key, with step-by-step
rotation guides and an MCP bridge so AI agents can use the keys without ever seeing them.

This repo covers **SHRP-001 through SHRP-014** from the backlog:

- A Next.js 15 (App Router) + TypeScript + Tailwind scaffold (SHRP-001).
- Supabase Postgres schema with Row-Level Security on every table (SHRP-002).
- Magic-link email signup / login via Supabase Auth (SHRP-003).
- Master-passphrase setup with client-side Argon2id key derivation (SHRP-004).
- Vault unlock with 3-attempt cooldown (SHRP-005).
- BIP-39 recovery code flow with forced acknowledgement (SHRP-006).
- AES-256-GCM encryption module + Vitest tests (SHRP-007).
- Project list, create-project dialog, Postgres-enforced free-tier limit (SHRP-008).
- Add-credential dialog with service grid, type picker, env, paste field (SHRP-009).
- Live key-format detection that nudges you when a paste looks wrong (SHRP-010).
- Project view with grouped credentials, env chips, rotation status pills (SHRP-011).
- Reveal credential with 10s auto-hide, copy with 30s clipboard clear, audit log on every action (SHRP-012).
- Edit (label / env / paste-to-rotate) and soft-delete with type-the-label confirmation (SHRP-013).
- Project settings — rename, archive, hard-delete with type-the-name confirmation, cascade to credentials & MCP tokens, user-level audit preserved (SHRP-014).
- "Needs attention" widget on /vault listing overdue and due-soon credentials, with deep links that scroll-and-flash the target row (SHRP-026).
- Mark-as-rotated action for the case where the user rotated externally and just wants to reset the tracker (SHRP-027).
- Playbook system: TSX-based playbooks at `content/playbooks/[service].tsx`, a Sheet drawer with sticky section nav, deep-linkable by `?playbook=SECTION` (SHRP-015).
- Stripe playbook — first complete playbook covering Overview, Where to find each key, Recommended scopes, Rotation (with zero-downtime roll), Revocation if leaked, Common pitfalls (SHRP-016).

What is **not** in this slice yet: audit log viewer (SHRP-028),
the remaining 11 service playbooks, the MCP server, Stripe billing.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Walk through env-var setup interactively
#    (prompts for Supabase URL + anon key + service role + site URL,
#    writes .env.local, prints the exact Vercel env vars to copy.)
npm run setup

# 3. Run the database migrations in Supabase
#    Dashboard → SQL Editor → paste each file in order, click Run:
#      supabase/migrations/0001_init.sql
#      supabase/migrations/0002_project_limits.sql
#      supabase/migrations/0003_soft_delete_purge.sql
#      supabase/migrations/0004_project_settings.sql

# 4. Run the dev server
npm run dev
# Open http://localhost:3000

# 5. Run the tests
npm test
```

## Pushing to GitHub + Vercel

```bash
# Initialise git locally (asks for your name/email if not configured)
npm run init-git

# Make your first commit
git commit -m "Initial commit: Sherpa MVP"

# Create a PRIVATE repo on GitHub (do NOT initialise with a README),
# then run the two commands GitHub shows you, like:
git remote add origin git@github.com:YOUR_USERNAME/sherpa.git
git push -u origin main
```

Then in Vercel:
1. **Import Project** → pick the GitHub repo. Auto-detects Next.js.
2. Before clicking Deploy, add the environment variables that `npm run setup`
   printed for you. Confirm the `SUPABASE_SERVICE_ROLE_KEY` is marked
   server-only (don't prefix it with `NEXT_PUBLIC_`).
3. Deploy. Once you have the production URL, update `NEXT_PUBLIC_SITE_URL`
   in Vercel to match, and add the URL to Supabase **Auth → URL
   Configuration → Site URL** and **Redirect URLs**.

Every push to `main` auto-deploys to production. Every PR gets its own
preview URL.

## Setting up Supabase

1. Go to <https://supabase.com> and create a new project (US region recommended).
2. Once the project is provisioned, open **Settings → API**. Copy the project URL
   and the `anon` public key into `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Copy the `service_role` secret key into `SUPABASE_SERVICE_ROLE_KEY`.
   **This key bypasses Row-Level Security. Never expose it to the browser.** It
   is only used server-side.
4. Open **SQL Editor** and run the migrations **in order**:
   - Paste `supabase/migrations/0001_init.sql` and click Run. This creates the
     `users`, `projects`, `credentials`, `audit_log`, `rotation_events`,
     `mcp_tokens`, and `waitlist` tables with RLS policies plus a trigger
     that auto-creates a `public.users` row whenever a new auth user signs up.
   - Paste `supabase/migrations/0002_project_limits.sql` and click Run. This
     adds a BEFORE INSERT trigger on `projects` that enforces the free-tier
     1-project limit at the database (so the limit can't be bypassed by a
     custom client).
   - Paste `supabase/migrations/0003_soft_delete_purge.sql` and click Run.
     This adds a `purge_soft_deleted_credentials()` function that hard-
     deletes credentials whose `deleted_at` is older than 30 days. Call
     it on a daily schedule from a Supabase Edge Function or Vercel Cron
     Job. See comments in the migration for details.
   - Paste `supabase/migrations/0004_project_settings.sql` and click Run.
     This switches `audit_log.project_id` to `ON DELETE SET NULL` so the
     user-level audit trail survives a project deletion.
5. Under **Authentication → Email Templates**, optionally customize the magic
   link email. The default works fine.
6. Under **Authentication → URL Configuration**, add `http://localhost:3000`
   (and your production domain later) to **Site URL** and to **Redirect URLs**.

## Project structure

```
app/
  layout.tsx          Root layout, mounts VaultKeyProvider
  page.tsx            Public landing page
  signup/page.tsx     Magic-link signup
  login/page.tsx      Magic-link login
  auth/
    callback/         Magic-link callback that exchanges code → session
    logout/           POST endpoint that signs out and redirects home
  vault/
    layout.tsx        Server-side auth gate
    page.tsx          Vault home (placeholder for SHRP-008+)
    setup/page.tsx    SHRP-004 + SHRP-006: passphrase + recovery code
    unlock/page.tsx   SHRP-005: vault unlock with cooldown
components/ui/        Small Tailwind primitives (button, input, card, callout)
lib/
  crypto.ts           SHRP-007: Argon2id + AES-256-GCM
  crypto.test.ts      Vitest suite covering round-trips and tamper detection
  passphrase.ts       Lightweight entropy estimator (zxcvbn replacement)
  recovery.ts         BIP-39 recovery code helpers
  vault-context.tsx   In-memory derived-key context (NEVER persisted)
  supabase/
    client.ts         Browser-side Supabase client
    server.ts         Server-component Supabase client
    middleware.ts     Cookie refresh + /vault/* auth gate
  utils.ts            cn() helper
supabase/migrations/
  0001_init.sql       Tables, RLS policies, triggers
middleware.ts         Next.js middleware that wires supabase/middleware.ts
```

## Security model — short version

- The user picks a master passphrase. We derive a 32-byte key from it using
  Argon2id (t=3, m=64MiB, p=1) with a per-user 16-byte salt.
- The salt is stored on the server. The passphrase is **not**, and neither is
  the derived key. The key lives only in React context, only for the page session.
- A short sentinel string (`sherpa-ok`) is encrypted with the key at signup and
  stored. On unlock, the user enters their passphrase, we re-derive the key,
  and we try to decrypt the sentinel. If it succeeds, the passphrase is correct.
- A separate 12-word BIP-39 recovery code is generated client-side. We derive
  a recovery key from it, use that to encrypt the passphrase, and store the
  ciphertext. The recovery code itself is **never** stored.
- Refreshing the browser tab forces a re-unlock. The derived key is not
  persisted to localStorage, IndexedDB, or cookies.
- Every table has Row-Level Security enabled with policies of the form
  `auth.uid() = user_id`. Even with a leaked anon key, a user can only read
  their own rows.

### Why not Supabase Vault?

Supabase ships a `supabase_vault` extension (pgsodium under the hood) that
encrypts secrets at the database layer. It's a legitimate and useful tool,
but it's **deliberately not used for storing user credentials in Sherpa**.

The two systems solve different problems:

- **Supabase Vault** holds the encryption key on the server. Disk backups,
  replication streams, and stolen drives can't reveal the plaintext, but
  anyone with valid database access (the service-role key, a Supabase
  support engineer, a successful SQL injection) can read the decrypted
  view and see the plaintext. The threat model is "protect against
  infrastructure theft".
- **Sherpa's client-side encryption** derives the key in the user's
  browser from their master passphrase via Argon2id. The plaintext is
  encrypted *before* it ever leaves the browser. Supabase only ever stores
  ciphertext. The threat model is "protect against everyone, including
  Sherpa itself" — sometimes called zero-knowledge.

Sherpa's headline technical claim — *Claude never sees your Stripe key, and
neither do we* — only holds under the second model. The moment the
encryption key lives on a server we control, that claim collapses to "we
promise we're nice", which is what every other SaaS already says.

Where Supabase Vault *would* fit comfortably is for **Sherpa's own internal
secrets** (Stripe webhook signing secret for receiving payment events,
Sentry DSN, third-party tokens). Today those live in Vercel env vars,
which is equally secure and simpler. MCP access tokens
(`mcp_tokens.token_hash`, SHRP-029) stay bcrypt-hashed regardless — a
one-way hash means even a breach of that table doesn't yield usable tokens.

## Tests

```bash
npm test                 # one-shot
npm run test:watch       # watch mode
```

The Vitest suite covers:

- AES-256-GCM round-trips on empty strings, 1 KB payloads, and unicode.
- Tampered-ciphertext detection (must throw).
- Wrong-key decryption (must throw).
- Argon2id determinism with the same passphrase + salt.
- BIP-39 recovery code generation (12 words, distinct each run).
- Passphrase strength estimator: common passwords scored 0, sequences and
  repeats penalized, long mixed phrases score ≥3.

The crypto tests use lower Argon2id parameters (`ARGON_PARAMS_TEST`) so the
suite finishes in seconds. Production code uses the higher
`ARGON_PARAMS_PRODUCTION` parameters.

## Next stories

The next things to build (from `Sherpa_Backlog_MVP.xlsx`):

- **SHRP-008** Create-project flow with free-tier limit.
- **SHRP-009** Add-credential form (service picker + paste).
- **SHRP-010** Auto-detect key format and warn on mismatches.
- **SHRP-011** List/view credentials.
- **SHRP-012** Reveal/copy with auto-clear.
- **SHRP-015 / SHRP-016+** Playbook renderer and the first playbook (Stripe).
- **SHRP-040 / SHRP-029–032** Key sealing model and MCP Agent Bridge.

## License

Private — not yet released.
