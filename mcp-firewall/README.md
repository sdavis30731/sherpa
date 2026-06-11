# @sherpakeys/mcp-firewall

**Local AI firewall.** Your Claude / Cursor / Cowork uses your API keys to call Stripe, GitHub, and more — without ever seeing them. Runs entirely on your machine. No SaaS account, no signup, no Supabase, encrypted local vault.

This is the standalone, install-locally version of the SherpaKeys MCP firewall. The keys live in an AES-256-GCM-encrypted file in your home directory. The MCP server runs as a subprocess of Claude Desktop (or Cursor, or any MCP client). The key value lives in process memory only — it never appears in your chat transcripts, your prompts, or your AI provider's logs.

For the hosted version with team vaults, audit log, email-based write approvals, and rotation playbooks, see [sherpakeys.com](https://sherpakeys.com).

---

## Install in 60 seconds

```bash
# Once published to npm:
npx @sherpakeys/mcp-firewall init

# Until then, from a local clone:
cd mcp-firewall
npm install
npm run build
node dist/cli.js init
```

You'll be prompted for a master passphrase. The vault file is created at `~/.sherpakeys/vault.json.enc`.

## Add a credential

```bash
node dist/cli.js add stripe STRIPE_SECRET_KEY
# (paste a Stripe test key — anything starting with sk_test_)
```

Repeat for any other supported services. v0.1 supports `stripe` and `github`. v0.2 will add `openai` and `anthropic`.

## Wire into Claude Desktop

```bash
node dist/cli.js config
```

That prints a config snippet. Add it to your Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

The snippet looks like:

```json
{
  "mcpServers": {
    "sherpakeys": {
      "command": "node",
      "args": ["/absolute/path/to/dist/cli.js", "serve"],
      "env": {
        "SHERPAKEYS_PASSPHRASE": "<your master passphrase>"
      }
    }
  }
}
```

The passphrase has to be in the config because Claude Desktop launches the server without a TTY. The config file lives in your home directory and is no more sensitive than the vault itself — but if you're uncomfortable with that, you can run the server manually in a terminal and connect Claude to it via HTTP (coming in v0.2).

Fully quit and restart Claude Desktop. In a new conversation:

> *"What services can you use through SherpaKeys?"*

Claude should call `sherpa_list_services` and tell you about your Stripe and GitHub credentials. Then ask:

> *"List the most recent Stripe customers."*

Claude calls `sherpa_call_api` with `service: "stripe"`, `name: "STRIPE_SECRET_KEY"`, `method: "GET"`, `path: "/v1/customers"`. The firewall decrypts your key in memory, hits Stripe, returns the response. **Claude sees the customer list. Claude never sees the secret.**

---

## What works in v0.1

- Local encrypted vault — AES-256-GCM with scrypt key derivation
- Two MCP tools: `sherpa_list_services` and `sherpa_call_api`
- Read-only allow-list — conservative by default
- Stripe + GitHub providers
- stdio transport for Claude Desktop / Cursor

## What's coming in v0.2

- Write-action approval — terminal prompt or local browser confirmation
- OpenAI + Anthropic providers
- Optional pairing with the hosted SherpaKeys vault for cloud sync and team sharing
- Audit log persistence (currently logs to stderr only)
- `config` command writes directly to `claude_desktop_config.json` instead of just printing the snippet

---

## How it actually works

```
┌─────────────────┐        ┌──────────────────────────┐        ┌──────────────┐
│ Claude Desktop  │  stdio │ sherpakeys-mcp-firewall  │  HTTPS │ Stripe /     │
│ (or Cursor,     │ ──────►│ (subprocess on your Mac) │ ──────►│ GitHub /     │
│  Cowork, …)     │        │                          │        │ etc.         │
│                 │        │ Decrypts your key in     │        │              │
│ Sees: API      │        │ memory just long enough  │        │              │
│ response.      │ ◄──────│ to make the call.        │ ◄──────│              │
│ Never sees     │        │ Logs the call to stderr. │        │              │
│ the key.       │        │                          │        │              │
└─────────────────┘        └──────────────────────────┘        └──────────────┘
                                        │
                                        ▼
                          ~/.sherpakeys/vault.json.enc
                          (AES-256-GCM, unlocked at startup)
```

The MCP protocol carries the AI's tool call as JSON-RPC over stdin/stdout. The firewall validates the call against its read-only allow-list, looks up the credential in the in-memory vault, dispatches the upstream HTTPS call, and returns the response body to Claude. **The credential value is never serialized into a JSON-RPC response.** It exists in process memory between the key lookup and the `fetch()` call, and that's it.

---

## Why a local install when SherpaKeys is also a hosted SaaS?

Because the most important "I want to try this" moment shouldn't require a signup. The hosted version is for when you've decided the firewall is the right shape and you want sync across machines, team vaults, audit retention, and write-action approval via email. The local install is for the 60 seconds where you decide whether the firewall is the right shape at all.

## Security notes

- The vault file is AES-256-GCM encrypted. Without your passphrase, the file is gibberish.
- The scrypt cost parameters (N=16384, r=8, p=1) take ~250ms on a modern laptop. Brute-forcing a strong passphrase against the vault file is not practical.
- The MCP server holds decrypted credentials in process memory while running. If malware on your laptop reads process memory, the keys are exposed — same threat model as any local vault.
- The MCP server only forwards requests that match a conservative read-only allow-list. Write actions are explicitly refused in v0.1.
- The server logs every outbound request to stderr, including the path and HTTP status. The credential value is never logged.

For the full threat model and cryptography details, see [sherpakeys.com/security](https://sherpakeys.com/security).

## License

MIT. See [LICENSE](../LICENSE).
