# SherpaKeys v1.1 — Launch Kit

> *"Let AI work on your app. Don't hand it the keys."*

This file contains every channel asset you need to launch v1.1:

1. **[Blog post](#blog-post-canonical)** — the canonical announcement, ~2000 words
2. **[Show HN submission](#show-hn-submission)** — title + first comment
3. **[X / Twitter thread](#x--twitter-thread)** — 13 tweets
4. **[Product Hunt](#product-hunt-launch)** — tagline + description
5. **[LinkedIn post](#linkedin-post)** — professional voice variant
6. **[Coordination checklist](#coordination-checklist)** — order of operations on launch day

All built around the new tagline. All link to the same set of receipts:
the live homepage, the open-source MCP server, the SECURITY.md, the live
demo of an AI agent creating a real Stripe customer through the
firewall without seeing the secret key.

---

## Blog post (canonical)

### Title

**Let AI work on your app. Don't hand it the keys.**

*Introducing SherpaKeys: the AI firewall for indie developers shipping
with Claude, Cursor, and Bolt.*

---

### The 11pm moment

It's the night before launch.

You've spent the last six weeks building something real — your first app,
your fourth side project, the thing your friends are actually going to
use. You did it with Claude or Cursor at 2am. You shipped a thing most
people only talk about doing.

Now you're scrolling through your `.env` file at 11pm wondering if you
remembered to set up a Stripe webhook signing secret. You can't
remember where you put the production OpenAI key. The Supabase service
role key is — wait. Did you accidentally prefix it with `NEXT_PUBLIC_`?

You ask Claude. You paste the key into the chat. Claude says yeah, that
looks right.

The key is now in your AI transcript. Forever. It got shipped to a
model provider. It might end up in your laptop's screenshot archive.
Tomorrow morning your customer will sign up and your launch day will
either be the best day of the year or the worst.

This is the problem.

### The deeper problem

It used to be that the worst thing your AI assistant could do was give
you bad advice. You'd ask Claude how to fix something; Claude would
suggest something dumb; you'd ignore it. Worst case: an hour wasted.

That's not the world anymore. AI agents now *do* things. Cursor's
agentic mode runs full tool loops. Cowork ships scheduled tasks that
execute autonomously. Claude calls APIs through the Model Context
Protocol. The new question isn't "what does Claude know?" — it's
**"what is Claude about to do, and can I stop it in time if it's
wrong?"**

A hallucinated refund. A misread DROP TABLE. A debug session that
nukes production. A prompt-injected agent exfiltrating data through a
webhook. These aren't theoretical anymore — they're the kind of failure
modes that *will* happen, at scale, in the next six months, to indie
developers who didn't know they needed protection.

The current options are two extremes:

- **Don't give AI agents real credentials.** You stay safe. You also
  give up most of what makes AI coding tools useful. The agent can
  read your code but can't check whether your webhook is configured,
  whether your service_role key is bundled into the wrong place, or
  whether the SQL it's about to write would break production. You
  become the bottleneck for every check.

- **Give them everything.** You unblock the agent. You also expose
  your secrets to every transcript and every tool call. One leaked
  log file or one prompt-injected agent and you're explaining to your
  customers why their data was breached.

Neither is good enough for the world we're now in.

### What SherpaKeys is

SherpaKeys is two things in one tool, designed to work together.

**A zero-knowledge credential vault.** Your master passphrase never
leaves your device. Your API keys are encrypted in your browser with
AES-256-GCM using a key derived from that passphrase via Argon2id. Our
server only ever sees ciphertext. If our database leaked tomorrow, the
attacker would walk away with a list of email addresses and a pile of
unreadable bytes. Same model as 1Password, Bitwarden, ProtonMail — the
proven architecture, applied specifically to the credentials a vibe
coder actually has.

**An AI firewall.** When Claude or Cursor needs to call Stripe or
Supabase or GitHub, the agent calls *SherpaKeys* instead. SherpaKeys
decrypts the credential server-side, makes the API call, returns the
response. **The model never sees the secret.** And writes — anything
not on a small allow-list of read operations — require explicit human
approval via an email link before they execute.

You get autonomous read-side agents (great for debugging, great for
diagnostics, great for the "is my webhook configured?" check that
should take 30 seconds and currently takes 30 minutes). And you get
human-in-the-loop write-side agents (good for safety, good for sleep,
good for not refunding the wrong customer at 3am).

No more pasting secrets into chat. No more accidental destructive
calls. No more "I trust the LLM, mostly, I think."

### What it actually looks like

I asked Claude in Cowork: *"Use SherpaKeys to create a Stripe customer
with email `test-firewall@sherpakeys.com` and description 'AI firewall
verification test.'"*

Here's what happened, in order:

1. Claude called `sherpa_list_services` to find my Stripe credential.
2. Claude called `sherpa_call_api` with `POST /v1/customers`.
3. SherpaKeys' AI firewall classified the request as a **write
   action**, refused to execute it immediately, and queued it for my
   approval.
4. SherpaKeys sent me an email titled *"[SherpaKeys] Approve write
   action: stripe/customers"* with a button to review.
5. I clicked the link, landed on an approval page that showed me
   exactly what was about to happen: *"POST stripe/customers — email
   test-firewall@sherpakeys.com, description AI firewall verification
   test."*
6. I clicked **Approve and execute.**
7. SherpaKeys decrypted my Stripe secret key server-side, made the API
   call, returned the response, and zeroed the key out of memory.
8. Back in Cowork, Claude polled the approval status, got the result,
   and told me the customer was created. ID: `cus_UcqBi541zF9OqV`.

That customer exists in my real Stripe account. The API call really
happened. Claude got the result. **Claude never saw my Stripe key.**

That's the AI firewall, working in production, on the first real test.

### The receipts

SherpaKeys is open source. The MCP server itself, the AI firewall
logic, the zero-knowledge crypto — all of it is published under the
MIT license on GitHub. The reasons are practical:

- **Trust.** Closed-source security middleware is an immediate red
  flag, especially for the indie-developer audience who reads code
  before they install things. Open-sourcing the MCP server lets you
  audit how we zero memory after a credential decrypt, exactly how
  the agent session key is sealed, exactly what gets logged. The
  security comes from the math (Argon2id, AES-256-GCM, SHA-256), not
  from the code being secret.

- **Community.** The hard work of secure credential handling shouldn't
  have to be rebuilt for every new MCP integration. Other people will
  want to add provider support (Anthropic API, Resend, Linear,
  Twilio…). Open source means the community can contribute, and the
  codebase becomes uncloneable because it carries their work.

- **Anthropic's incentives.** They built MCP to grow an ecosystem of
  trusted integration partners. They don't want to build every
  security layer themselves. Open-sourcing the MCP server positions
  SherpaKeys as the reference implementation for secure credential
  access in the MCP ecosystem.

The full security architecture — threat model, cryptography parameters,
the agent session carve-out, responsible disclosure process — is
documented in [SECURITY.md](./SECURITY.md). It's the document we want
skeptics to read first.

### What's on the v1.2 roadmap

The AI firewall today checks credentials and configuration. v1.2 takes
the Go-Live Check further with checks that require talking to your
actual services:

- Webhook endpoint reachability (Stripe, Resend)
- DNS record validation (SPF/DKIM/DMARC for sending domains)
- Env-var sync between your local `.env` and your Vercel production
- OAuth callback URL validation
- AI provider spend cap detection
- Supabase RLS policy audit on anon-reachable tables
- Active-key status check at the provider

Each of these turns into a green check in your readiness score. Each
shrinks the "what we did NOT check" panel on the homepage. The honest
list of what we're not yet checking is, itself, the v1.2 roadmap.

There's also a Pro tier coming for teams — shared vaults, SSO,
centralized approval queues, audit log export. If you run engineering
at a place where AI agents touch production, you can [join the
early-access list](https://sherpakeys.com/signup?intent=pro-waitlist)
right now.

### What you can do today

If you're shipping with AI tools, here's the 60-second self-test:

1. Open [sherpakeys.com](https://sherpakeys.com).
2. The homepage analyzer runs a Go-Live Check on a redacted sample
   `.env` by default. Look at the score.
3. Swap in a redacted version of your own `.env` — none of it leaves
   your browser. See what your real Go-Live readiness score is.
4. If you want the actual AI firewall: sign up (free, 1 project,
   permanent), connect your MCP client (Claude Cowork, Cursor,
   Claude Desktop), and try a write action. See it get gated.

The free tier is real. The MCP firewall works on it. No card needed.

We built SherpaKeys for the people who are out here building real
software at 2am with Claude — the founders, the indie hackers, the
career-switchers, the late-stage builders, the people who shipped
something incredible without a CS degree and now have to figure out
how to keep it from breaking. The category is forming this quarter.
The risk is real. The defense layer needs to exist.

We're glad to be the ones who built it.

— SherpaKeys

🌐 [sherpakeys.com](https://sherpakeys.com)
🔒 [SECURITY.md](https://github.com/sdavis30731/sherpa/blob/main/SECURITY.md)
📦 [Open source on GitHub](https://github.com/sdavis30731/sherpa)
📜 [MIT licensed](https://github.com/sdavis30731/sherpa/blob/main/LICENSE)

---

## Show HN submission

**Title (Show HN format, 80 chars max):**

```
Show HN: SherpaKeys – AI firewall that lets Claude use your Stripe key safely
```

Alternative titles to A/B in your head:

- `Show HN: SherpaKeys – Let AI work on your app. Don't hand it the keys`
- `Show HN: An open-source AI firewall for indie devs shipping with Claude`
- `Show HN: Zero-knowledge credential vault + MCP firewall for AI agents`

**URL:** `https://sherpakeys.com`

**First comment** (post this immediately after submitting):

```
Hey HN — Steve here, solo builder.

Quick context: I'm a non-engineer who's been shipping real software with
Claude and Cursor for the last year. The thing that kept biting me was
giving AI agents access to my Stripe / Supabase / Vercel keys for
diagnostics. Pasting them into chat felt obviously wrong. The MCP
ecosystem is brand new and there's no standard for "let an agent USE my
keys without SEEING them." So I built one.

The architecture:

1. Zero-knowledge vault. Your master passphrase derives an AES-256
key in-browser via Argon2id. Server only stores ciphertext. Same
model as 1Password.

2. MCP server with a "write-action firewall." Anything not on a small
read-list (per service, conservative by default) gets queued for
your approval. You get an email with the action summary in plain
language ("POST stripe/customers with email=..."), one click to
approve, server-side execution with zeroed memory afterward. The
agent never sees the secret.

The MCP server is open-source (MIT). Threat model and crypto stack are
documented in SECURITY.md. The agent session key sealing is the one
place where strict zero-knowledge deliberately bends — I'm honest
about that in the docs.

Free tier is real (1 project, 100 MCP calls/month, permanent). $19
one-time for unlimited projects. Pro tier (teams) is coming.

What I'd love feedback on:

- The agent session carve-out — is the tradeoff documented honestly?
- The conservative-by-default write classifier in lib/write-actions.ts
- Whether the homepage explains the problem in 5 seconds for someone
  who isn't already in the MCP ecosystem

GitHub: https://github.com/sdavis30731/sherpa
Security: https://github.com/sdavis30731/sherpa/blob/main/SECURITY.md

Happy to answer any questions.
```

---

## X / Twitter thread

(13 tweets. Each ~270 chars or less to leave room for retweet text.)

**1/**
You give Claude your Stripe key to debug a webhook.

That key now lives in your transcript forever.

It gets shipped to a model provider.

It might end up in a screenshot, a log, a leaked browser history.

There has to be a better way. So I built one.

**2/**
Introducing SherpaKeys — the AI firewall for indie developers.

"Let AI work on your app. Don't hand it the keys."

→ https://sherpakeys.com

A 🧵 on what it does, why it exists, and how it works.

**3/**
Two things in one:

🔒 A zero-knowledge credential vault. Your keys are encrypted in YOUR browser. Our server only sees ciphertext. We can't read your secrets even if we wanted to.

🚧 An AI firewall. Agents can USE your keys. They never SEE them.

**4/**
How the firewall works:

You ask Claude to "check if your Stripe webhook is configured."

Claude calls SherpaKeys (not Stripe directly).

SherpaKeys server-side decrypts the key, calls Stripe, returns the response.

Claude gets the answer. Claude never touches the secret.

**5/**
What about destructive actions? Refunds. Deletes. Drops. Real money.

Anything classified as a "write" gets gated:

→ Email arrives in your inbox
→ Plain-language summary: "POST stripe/refunds amount=$48"
→ One click to approve
→ The agent gets the result only after you said yes

**6/**
The AI firewall is conservative by default.

Anything not on a small per-service allow-list of read operations gets treated as a write requiring your approval.

GET /charges? Read.
POST /customers? Write.
POST /refunds? Write.
DELETE /database? Write.

Better to over-ask than to silently destroy.

**7/**
Real test: I asked Claude in Cowork to create a Stripe customer.

It got queued. Email arrived. I clicked Approve. Customer created in my real Stripe account. ID: cus_UcqBi541zF9OqV.

Claude got the result. Claude never saw my Stripe key.

This works in production. Today.

**8/**
The MCP server is open source.

MIT license. Full threat model in SECURITY.md. Conservative write-action classifier. Agent session key sealing documented honestly (including the one tradeoff where strict zero-knowledge bends, and why).

→ https://github.com/sdavis30731/sherpa

**9/**
Why MCP matters: Claude, Cursor, Cowork, Codex all speak it. SherpaKeys works with all of them out of the box.

Anthropic built MCP to grow an ecosystem of trusted partners. Secure credential handling is the natural slot. We want to be the standard.

**10/**
Who this is for:

→ Vibe coders shipping with AI who DON'T want to paste secrets into chat
→ Indie devs who let Cursor's agentic mode run on real APIs
→ Engineering teams who need a write-action approval queue
→ Anyone who's woken up at 3am wondering

**11/**
Pricing:

Free forever — 1 project, full AI firewall, 100 MCP calls/month. No card.

$19 once — unlimited projects, 5,000 MCP calls/month.

Pro (teams) coming next — unlimited calls, SSO, team vaults, audit export. Early access list open.

**12/**
What's on v1.2:

Webhook reachability checks. DNS hygiene. Env-var sync to Vercel. OAuth callback validation. AI provider spend cap detection. Supabase RLS audit.

Each shrinks the honest "what we did NOT check" panel on the Go-Live Check.

**13/**
Try it: paste a redacted .env at https://sherpakeys.com — Go-Live score in seconds, no signup.

Open source: https://github.com/sdavis30731/sherpa

Threat model: link above.

Built by one person (me) for everyone shipping AI-built apps. Reposts genuinely appreciated. 🙏

---

## Product Hunt launch

**Tagline (60 chars):**

> AI firewall for indie devs shipping with Claude and Cursor

**Description (260 chars):**

> SherpaKeys is the AI firewall for AI-built apps. Zero-knowledge credential vault + MCP server that lets Claude use your Stripe/Supabase keys without seeing them. Write actions need your explicit approval. Open source. Free tier real. Built for vibe coders.

**Categories:**
- Developer Tools (primary)
- Security
- Artificial Intelligence
- Productivity

**First comment** (post immediately after launch goes live):

```
Hey Product Hunt!

I built SherpaKeys because I kept pasting my Stripe key into Claude
to debug things and getting a sick feeling watching it scroll past
in my chat history.

The core insight: AI agents need to ACT on real APIs to be useful,
but giving them direct access to your secrets is structurally
dangerous. Prompt injection. Transcript leaks. Screenshots.

SherpaKeys sits between Claude/Cursor/Codex and your APIs. The
agent makes a call through us. We decrypt the credential
server-side, make the call, return the response, zero the key.
The agent gets the answer; the agent never sees the secret.

For destructive actions (refunds, deletes, money-moving things), we
queue them and email you a plain-language summary with an Approve
button. No more "did my agent just refund the wrong customer at
3am" anxiety.

The MCP server is open source under MIT. Full threat model lives
in SECURITY.md. The free tier is real and permanent.

Happy to answer questions. Built by one person (me), for everyone
who's been shipping AI-built apps and quietly worrying about this.

Try the Go-Live Check at sherpakeys.com — no signup needed. Paste a
redacted .env, see your readiness score.
```

---

## LinkedIn post

(Slightly more professional voice for the LinkedIn audience.)

```
A year ago, AI coding tools were a curiosity. Today, they're
infrastructure. Cursor's agentic mode runs full tool loops. Cowork
ships scheduled tasks that execute autonomously. Claude calls APIs
through the Model Context Protocol.

The question is no longer "what does the AI know?" — it's "what is
the AI about to DO, and can I stop it if it's wrong?"

I built SherpaKeys to be the safety layer for that question.

Two things in one:

1. A zero-knowledge credential vault. Your API keys are encrypted in
your browser before they touch our servers. We can't decrypt them
even if we wanted to. Same architectural model as 1Password and
Bitwarden — applied specifically to the developer credentials a
modern indie founder actually has.

2. An AI firewall (MCP server). When Claude, Cursor, or Codex needs
to call Stripe or Supabase or GitHub, the agent calls us instead. We
decrypt the credential server-side, make the API call, return the
response. The model never sees the secret. And destructive actions —
refunds, deletes, money-moving things — require your explicit
approval via an email link before they execute.

For the engineering teams who let AI agents touch production: this
is the safety review layer your auditors are going to ask for. We're
opening early access for the Pro tier (centralized approval queue,
SSO, team vaults, audit log export).

For the indie developers shipping with AI: this is the tool you
build with at 2am so you don't have to worry at 3am.

The MCP server is open source under the MIT license. The threat
model is documented publicly. The free tier is permanent.

If you're shipping AI-built software — or letting AI agents touch
production at work — I'd love to hear what you think.

→ sherpakeys.com
```

---

## Coordination checklist

When you decide to pull the trigger, here's the order of operations on
launch day. (Most-to-least important; aim to do all of it within an hour.)

**Pre-launch (the night before):**

- [ ] Make the SherpaKeys GitHub repo public (it's currently private)
- [ ] Verify the README, LICENSE, SECURITY.md render correctly on GitHub
- [ ] Verify `npm test` still passes from a fresh clone (a friend can verify)
- [ ] Set up `security@sherpakeys.com` as a real email address in
      Microsoft 365 (referenced in SECURITY.md)
- [ ] Verify the homepage hasn't drifted since the last deploy
- [ ] Confirm the production Resend domain is fully verified
- [ ] Make sure all your test approvals are cleaned up (delete the
      `cus_UcqBi541zF9OqV` test customer in Stripe)
- [ ] Pre-write the X thread in a notes app so you can paste it tweet by tweet

**T-0 (launch hour):**

1. **Post the blog** wherever it lives (Substack, your domain, dev.to)
2. **Submit Show HN** with the title above. Post the first comment
   immediately so you set the conversation tone.
3. **Start the X thread.** Post all 13 tweets in sequence over ~5
   minutes (don't auto-thread — gives more engagement when each
   tweet posts separately).
4. **Submit to Product Hunt** if it's a weekday morning Pacific time
   (the algorithm favors PT morning).
5. **Post the LinkedIn variant** for the more professional audience.
6. **Send the launch announcement to anyone you've talked to about
   SherpaKeys** — friends, advisors, anyone who said "tell me when
   you launch." Personal messages convert 10x better than broadcast.

**T+1 hour to T+6 hours:**

- Reply to every HN comment within 15 minutes. Be honest, especially
  about limits. HN respects honesty more than confidence.
- Quote-tweet replies on X with brief responses. Engagement compounds.
- Watch the Product Hunt comments and reply.
- Don't refresh the upvote counter compulsively. Talk to humans.

**T+24 hours:**

- Write a follow-up post: "What I learned from the SherpaKeys
  launch." Real numbers (signups, MCP calls, repo stars). Real
  surprises. This becomes the next piece of content.

---

*Drafted while you were packing. Read it on your phone between trips.
Edit anything that doesn't sound like you. The launch happens when
you say it happens — none of these assets care about today vs Tuesday
vs next week. They're ready when you are.*
