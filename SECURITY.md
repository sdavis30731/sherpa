# SherpaKeys Security Architecture

**Last updated:** 2026-06-01
**Audience:** developers and security researchers evaluating SherpaKeys
**Reporting issues:** security@sherpakeys.com

---

## TL;DR

SherpaKeys does two security-critical things:

1. **Stores your API keys under zero-knowledge encryption.** Your master
   passphrase never leaves your device. Credentials are encrypted in your
   browser with AES-256-GCM using a key derived from that passphrase via
   Argon2id. Our servers only ever see ciphertext. If our database leaked
   tomorrow, the attacker would walk away with a list of email addresses
   and a pile of unreadable gibberish.

2. **Stands between AI agents and your live production APIs.** When Claude,
   Cursor, or Codex calls Stripe or Supabase or GitHub *through* SherpaKeys,
   the MCP server decrypts your key server-side, makes the call, returns the
   response, and zeros the key out. The model never sees the secret.
   Write actions (anything not on a small allow-list of read operations)
   are gated: SherpaKeys queues an approval request, emails you, and the
   agent only sees the result *after* you click Approve.

Both properties are auditable in this repository. The cryptography is
standard primitives (Argon2id, AES-256-GCM, SHA-256). The architecture is
documented below. The code is MIT licensed.

---

## 1. The two-layer security model

### Layer 1: The vault (strict zero-knowledge)

Your credentials live in our database as **opaque AES-256-GCM ciphertext.**
SherpaKeys, as an organization, cannot decrypt them. This is not a
"we promise we're nice" claim — it's a structural property of where the
encryption key lives.

The encryption flow:

1. You enter your master passphrase **in your browser**. It never leaves
   your device. It is not logged, not sent in any request, not stored in
   any cookie or local storage.
2. Your browser runs `Argon2id(passphrase, salt)` to derive a 32-byte
   "vault key." The salt is per-user, 16 random bytes, stored on our
   server. The passphrase is **not** stored. The derived key is **not**
   stored — it lives only in the in-memory React context of the open tab.
3. When you save a credential, your browser generates a fresh 12-byte
   IV, encrypts the credential with `AES-256-GCM(vaultKey, IV)`, and sends
   only the ciphertext + IV to our server.
4. When you read it back, your browser fetches the ciphertext, decrypts
   locally, displays for the configured reveal window (10 seconds default),
   and zeroes the variable.
5. Refreshing the tab forces a re-unlock. The vault key never persists.

Argon2id parameters: `t=3, m=64MiB, p=1`. These are conservative for modern
hardware and make brute-forcing a strong passphrase impractical in any
human lifetime.

### Layer 2: The MCP agent bridge (scoped carve-out)

The vault's strict zero-knowledge model would make AI agent usage
impossible — if SherpaKeys can't decrypt your Stripe key, neither can it
call Stripe on your behalf. So we added a deliberate, scoped, opt-in
escape hatch: the **agent session.**

Agent sessions trust the SherpaKeys server slightly more than the strict
vault does. We are explicit about that tradeoff and the mitigations.

The setup, once per device when you authorize agents:

1. You go to your project's "AI Agent access" page and choose which
   credentials to include in the session.
2. Your browser, with your vault key in memory, decrypts those
   credentials, generates a fresh 256-bit ephemeral session key, and
   re-encrypts the credentials with that session key.
3. The browser **seals the session key** with a server-held master key
   (`AGENT_SESSION_MASTER_KEY`, 32 random bytes stored as a Vercel env
   var). The sealed blob and the re-wrapped credentials go to the server.
4. The browser zeroes the session key from memory. The user gets an MCP
   token (`shrp_...`) to paste into Cowork/Cursor/etc.

The call, every time an agent makes a request:

1. The agent sends an HTTP POST to `/api/mcp/v1` with `Authorization:
   Bearer shrp_...` and a JSON-RPC payload describing the tool call.
2. SherpaKeys validates the token via SHA-256 hash lookup.
3. SherpaKeys unseals the session key using `AGENT_SESSION_MASTER_KEY`.
4. SherpaKeys decrypts **only the specific credential** needed for the
   call (not the whole session). It does NOT decrypt other credentials.
5. SherpaKeys calls Stripe (or Supabase, or whatever) using the
   credential. The agent never receives the credential — only the
   upstream API's response.
6. SherpaKeys zeroes the session key and the decrypted credential.

### What this means honestly

When an agent session is active, the SherpaKeys server has the
*theoretical capability* to decrypt the credentials in that session
(because we hold the master key). That is a real difference from the
strict vault, where we have **zero capability** to decrypt anything.
The promise narrows from "we structurally cannot read your keys" to "we
can use them to call APIs you've authorized, never expose them to the
AI, log every action, and zero memory afterward."

If you never authorize an agent session, this code path is never
exercised and the strict vault guarantee applies to all your data.

---

## 2. The AI Firewall (write-action approval)

Beyond just storing keys safely, SherpaKeys gates *what agents can do*
with them.

### The principle

The MCP server classifies every `sherpa_call_api` request as either
**read** or **write** using a per-service registry in
`lib/write-actions.ts`. The registry is **conservative by default** —
anything not explicitly listed as a known-safe read operation is treated
as a write.

- **Read actions** (e.g. `GET /v1/charges`, `GET /repos`) execute
  immediately. The agent gets the response.
- **Write actions** (e.g. `POST /v1/customers`, `DELETE /repos/...`)
  trigger the approval flow.

### The approval flow

When an agent attempts a write:

1. SherpaKeys checks the token's `permission` column. Tokens default
   to **`read`** at creation — write actions are explicit opt-in.
2. If `permission='write'`, SherpaKeys verifies an active agent session
   exists and the target credential is part of it. If not, the request
   is refused without queuing (so no approvals end up in a doomed state).
3. SherpaKeys creates a `pending_approvals` row, capturing the full
   action context: service, method, endpoint, params, optional dollar
   amount, the originating MCP token, expiration (default 1 hour).
4. SherpaKeys sends an email to the token owner via Resend with a
   tokenized approval URL.
5. The MCP server returns a `pending_approval` response to the agent.
   The agent automatically polls `sherpa_get_approval_result` every
   few seconds.
6. The user clicks Approve on the email link, lands on `/approve/[id]`,
   reviews the proposed action in plain language (with a dollar amount
   if applicable), and clicks Approve.
7. SherpaKeys verifies all preconditions (credential, session,
   decryption) succeed BEFORE atomically marking the approval as
   `approved`. This prevents the "marked approved but never executed"
   failure mode.
8. SherpaKeys executes the upstream call, stores the result on the
   `pending_approvals` row, and the agent's next poll returns the
   real response.

### Per-token guardrails

Each MCP token can carry:

- **`permission`** = `read` (default) or `write`. Read-only tokens cannot
  request writes at all.
- **`dollar_cap_cents`** = optional integer. Write actions whose detected
  dollar amount exceeds this cap are refused before queueing.

### What this prevents

- A hallucinated agent action that would charge a customer or delete
  a database cannot execute without a human looking at the proposed
  action and clicking Approve.
- A compromised MCP token, by itself, cannot make write actions —
  because each write requires the human owner to approve via an email
  link tied to their authenticated browser session.
- A compromised email account *combined with* a compromised MCP token
  could theoretically approve writes. This is why MCP tokens can be
  revoked instantly and every action is in the audit log.

---

## 3. Threat model

### What SherpaKeys defends against

| Threat | How we defend |
|---|---|
| Database breach | Credentials are ciphertext; vault key is not on our server. |
| Insider read | Same — we cannot decrypt the vault. |
| Subpoena / legal compulsion for plaintext keys | We do not possess them. |
| Stolen MCP token | Token gives read-only access by default; writes need human approval. |
| Hallucinated agent action | Write actions require user approval before execution. |
| LLM prompt injection that triggers a destructive call | Same — gated by approval flow. |
| Network eavesdropping | All traffic is HTTPS; tokens are scoped per project. |
| Brute-force on weak passphrase | Argon2id `t=3, m=64MiB, p=1` makes guessing impractical. |
| Forgotten passphrase + lost recovery code | We cannot recover. This is the cost of zero-knowledge. |

### What SherpaKeys does NOT defend against

We name these explicitly so users can make informed decisions.

| Limitation | Why |
|---|---|
| Malware on your laptop | If keylogger captures your passphrase, no crypto helps. |
| Compromised Vercel / Supabase infra | The MCP server runs there; a compromise of the platform compromises the agent-session carve-out. The vault itself is still encrypted, but agent sessions are at risk. |
| You marking a phishing email as legitimate and clicking a fake approval link | We can't distinguish you from you-being-tricked. Check the URL. |
| Forgotten passphrase | Recover with your 12-word BIP-39 code. Forgot both → vault is unrecoverable. |
| You approving a malicious action because the LLM convinced you to | The firewall shows you the proposed action in plain language; we cannot make you read it. |

---

## 4. Cryptography stack

| Function | Algorithm | Parameters | Where |
|---|---|---|---|
| Passphrase → vault key | Argon2id | t=3, m=64MiB, p=1, 16-byte salt | `lib/crypto.ts` |
| Credential encryption | AES-256-GCM | 12-byte random IV per encryption | `lib/crypto.ts` |
| Recovery code | BIP-39 | 12 English words, 128-bit entropy | `lib/recovery.ts` |
| MCP token storage | SHA-256 | One-way hash; plaintext shown ONCE on generation | `app/api/mcp-tokens/route.ts` |
| MCP token format | random | 32 bytes hex with `shrp_` prefix | same |
| Agent session sealing | AES-256-GCM | server-held `AGENT_SESSION_MASTER_KEY` | `lib/agent-session.ts` |
| Transport | TLS 1.3 | enforced by Vercel / Supabase | platform |

All cryptography uses Web Crypto API primitives (browser-native, no JS
libs implementing crypto from scratch) and the audited `@noble/hashes`
and `@scure/bip39` libraries.

---

## 5. Where to look in the source

If you're auditing the security claims, these are the files that matter
most:

| File | What's in it |
|---|---|
| `lib/crypto.ts` | Argon2id key derivation + AES-256-GCM encryption/decryption. Round-trip tests in `lib/crypto.test.ts`. |
| `lib/agent-session.ts` | Agent session key sealing/unsealing with the server-held master key. |
| `lib/write-actions.ts` | The conservative read-list per service. Anything not here is treated as a write requiring approval. Tests in `lib/write-actions.test.ts`. |
| `lib/risk-rules.ts` | Configuration-misuse rules (e.g. NEXT_PUBLIC\_ on service_role keys, sk_live\_ in dev). |
| `app/api/mcp/v1/route.ts` | The MCP server itself. JSON-RPC 2.0 over HTTP. Implements the AI firewall write-action gate. |
| `app/api/approvals/[id]/approve/route.ts` | The approval execution path. Validates every precondition before atomically marking approved. |
| `app/api/mcp-tokens/route.ts` | MCP token generation. Default `permission='read'`. |
| `supabase/migrations/*.sql` | Database schema with Row-Level Security on every table. |

---

## 6. Responsible disclosure

If you discover a security vulnerability:

**Email:** security@sherpakeys.com
**PGP key:** (coming for v1.1 launch)
**What to include:** description of the issue, steps to reproduce,
your assessment of impact, and (optionally) suggestion for a fix.

**Our commitment:**

- Acknowledge receipt within 48 hours
- Investigate and respond within 7 days
- Credit you in the release notes if you wish (or not — your call)
- Coordinate disclosure timing with you before publishing a fix

**Out of scope** for our security program:

- Issues that require physical access to a user's unlocked device
- Self-inflicted issues (user choosing a 6-character passphrase)
- DoS via excessive request volume (we rate-limit; please don't try)
- Vulnerabilities in the underlying platforms (Vercel, Supabase,
  Resend, etc.) — report those upstream

---

## 7. Changelog of security-relevant changes

| Date | Change |
|---|---|
| 2026-06-01 | Initial public security documentation. AI Firewall (write-action approval) shipped to production. |
| 2026-06-01 | Approve-route reordered to verify all preconditions before atomic status claim, preventing "approved but unexecuted" stuck rows. |
| 2026-05-31 | Per-token `permission` (read/write) defaulting to read shipped. |
| 2026-05-30 | Agent session key sealing model shipped. |
| 2026-05-29 | MCP server reaches production. |

---

If you have questions about anything in this document, open an issue
or email security@sherpakeys.com. Security is a conversation, not a
declaration.
