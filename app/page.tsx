import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  FileCheck2,
  Users,
  Github,
  Search,
  Bot,
  Clock,
  GitCompare,
  AlertTriangle,
  Lock,
  KeyRound,
} from "lucide-react";
import { TopNav } from "./_components/top-nav";

/**
 * Homepage (SHRP-108) — Custody Record is the hero product.
 *
 * Major reposition from SHRP-106's lifecycle framing. The Custody
 * Record is now the one paid product; the vault, AI firewall, branded
 * client onboarding, and auto-rotation are bundled FREE and live as
 * "the infrastructure that makes the report defensible."
 *
 * Deliberate cuts (don't reintroduce without reason):
 *  · No $9/month client vault mention. That's a separate sales motion
 *    to a separate buyer (the client, after delivery) — disclosing it
 *    here makes the agency think their client is being charged.
 *  · No $19/project line. Free unlimited projects until we have signal
 *    that volume needs metering.
 *  · No on-page .env analyzer. /launch-readiness keeps it alive as a
 *    standalone viral page, linked from the footer only. The analyzer
 *    was a demo of the vault; the homepage now leads with the product.
 *
 * Page structure:
 *   1. Sticky top nav
 *   2. Hero — "Hand off every project like the shop twice your size"
 *   3. Custody Record showcase — the product (lifted up from #6)
 *   4. Who Wins — three audiences: agency, client, client's bankers
 *   5. Headaches — 4 cards in agency voice
 *   6. Workflow — 4 stages, all free, $99 at the finish line
 *   7. Trust block — honest tradeoff disclosure
 *   8. Open source — dark beat
 *   9. Pricing — single tile: $99 per Custody Record, everything else free
 *  10. Founding cohort — $79/record + founder line
 *  11. Footer (Go-Live Test link points to standalone /launch-readiness)
 *
 * Anchor IDs match TopNav's NAV_LINKS exactly.
 */

export default function HomePage() {
  return (
    <main className="min-h-full overflow-x-clip bg-white">
      {/* Sticky top nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6">
          <TopNav />
        </div>
      </header>

      {/* ============================================================
          HERO — pitch only. Crisp, single-column, no side-by-side
          analyzer (the analyzer used to make the hero too tall and
          left a big visual gap under the pitch, SHRP-094 fix).
          ============================================================ */}
      <div className="relative isolate">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-sherpa-50/70 via-white to-white"
        />
        <div className="mx-auto max-w-3xl px-6">
          <section className="pt-12 pb-14 sm:pt-20 sm:pb-20">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sherpa-700 shadow-sm backdrop-blur-sm">
              <Users className="h-3.5 w-3.5" /> Credential infrastructure for
              client work
            </div>
            <h1 className="text-balance text-5xl font-bold leading-[1.02] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Take on client credentials.
              <br />
              <span className="text-slate-400">Not client risk.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-2xl leading-tight tracking-tight text-slate-700 sm:text-3xl">
              Hand off every project like the shop that&apos;s twice your
              size.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              A{" "}
              <strong className="font-semibold text-slate-900">
                Go-Live Custody Record
              </strong>{" "}
              for every engagement — signed, dated, attested, and verifiable
              from a public URL. Your agency looks bigger. Your client looks
              audit-ready to their investor, banker, or next developer. The
              vault, AI firewall, branded client onboarding, and auto-rotation
              behind it?{" "}
              <strong className="font-semibold text-slate-900">All free.</strong>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sherpa-500/30 transition hover:shadow-lg hover:shadow-sherpa-500/40"
              >
                <KeyRound className="h-4 w-4" /> Start free{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sample-custody-record.html"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileCheck2 className="h-4 w-4" /> See a sample Custody Record
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Unlimited free projects. No credit card. No waitlist.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Browser-encrypted vault. AI never sees plaintext secrets.
            </p>
          </section>
        </div>
      </div>

      {/* ============================================================
          CUSTODY RECORD — the product. SHRP-108 lifted this section
          up to be the second beat because the document IS the wedge.
          The hero promises a verifiable handoff; this shows it.
          ============================================================ */}
      <section
        id="custody"
        className="scroll-mt-24 border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Mock document preview */}
            <div className="order-2 lg:order-1 lg:col-span-6">
              <CustodyRecordPreview />
            </div>

            <div className="order-1 lg:order-2 lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                The product
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                The handoff document
                <br />
                <span className="text-slate-400">
                  that makes you the bigger agency.
                </span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Every engagement ends with the Go-Live Custody Record — a
                signed, dated, branded document the client files, forwards
                to their accountant, and shows their next developer. One{" "}
                <strong className="font-semibold text-slate-900">$99</strong>{" "}
                deliverable. Everything else is free.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                <BulletCheck>
                  <strong>
                    SherpaKeys attestation seal + public verify URL.
                  </strong>{" "}
                  Every record carries a unique ID and a{" "}
                  <code className="rounded bg-slate-100 px-1 font-mono text-xs">
                    sherpakeys.com/verify/SKR-…
                  </code>{" "}
                  link. Anyone — the client, their banker, their next
                  developer — can confirm in one click that the record is
                  real and was issued by your agency. Clients learn to ask
                  for the verify URL the way they ask for a SOC 2.
                </BulletCheck>
                <BulletCheck>
                  <strong>Your branding, not ours.</strong> Logo, primary
                  color, custom footer. The record looks like your agency
                  built it from scratch.
                </BulletCheck>
                <BulletCheck>
                  <strong>Plain-English layer for the client.</strong>{" "}
                  &ldquo;What this means for you,&rdquo; per-service captions,
                  and &ldquo;What to watch for&rdquo; — so a non-technical
                  founder can actually act on it.
                </BulletCheck>
                <BulletCheck>
                  <strong>Generated, not previewed.</strong> No watermarked
                  draft to screenshot. You fill out the form, click
                  Generate, pay $99, and the rendered document exists.
                  Edits stay free.
                </BulletCheck>
              </ul>
              <Link
                href="/sample-custody-record.html"
                className="mt-8 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:shadow-md"
              >
                <FileCheck2 className="h-4 w-4" /> See a sample report{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          WHO WINS — three audiences, one document (SHRP-108).
          The Custody Record clears the room for three different parties
          at once: agency looks bigger, client feels empowered, client's
          investors/bankers can verify hygiene with a single URL.
          ============================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Three people. One document.
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Everyone wins the handoff.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Most handoff problems are really three problems wearing
              one hat. The Custody Record solves all three at once.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <WinnerCard
              eyebrow="The agency"
              title="You look like the bigger shop."
              body="A branded, attested deliverable replaces the awkward 'trust us, we cleaned up' email. You execute on what you do best — building — while the document protects your image and earns the repeat referrals."
            />
            <WinnerCard
              eyebrow="The client"
              title="A simple, guided experience."
              body="The credential side of a tech project is daunting. SherpaKeys hands your client a branded onboarding page tuned to their skill level — then leaves them with a one-page document that explains, in plain English, exactly what they now own."
            />
            <WinnerCard
              eyebrow="Their investors & bankers"
              title="One link, real verification."
              body="The verify URL means your client can show their next investor, banker, or auditor that credentials were handled cleanly — no PDFs to email, no screenshots to argue about, no chain of trust they have to defend."
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          HEADACHES
          ============================================================ */}
      <section
        id="headaches"
        className="scroll-mt-24 border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Client-work headaches
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              You&apos;ve lived at least one of these.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Most agency owners we talk to laugh and then go quiet at three
              of the four. Normal agency chaos. The kind a process fixes once,
              and then never again.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <HeadacheCard
              icon={Search}
              title="The client emailed us their live Stripe key."
              body="It&rsquo;s in their sent folder, your inbox, and your contractor&rsquo;s forwarded thread. Forever. There is no professional way to un-send a secret."
            />
            <HeadacheCard
              icon={Bot}
              title="Did your AI tools see our keys?"
              body="The client read an article about AI agents leaking credentials. You ship with Claude every day. You need a better answer than &ldquo;we&rsquo;re careful.&rdquo;"
            />
            <HeadacheCard
              icon={Clock}
              title="Handoff day. No receipts."
              body="The project&rsquo;s done. The client asks what was accessed, what was rotated, and what you still have. Right now the honest answer is a shrug and a Notion page."
            />
            <HeadacheCard
              icon={GitCompare}
              title="Three clients. Thirty keys. One folder of .env files."
              body="Client A&rsquo;s keys one tab away from Client B&rsquo;s. One wrong paste in one wrong chat, and you&rsquo;re writing the worst email of your year."
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          WORKFLOW — 4 stages, all on free infrastructure. The Custody
          Record is the destination, not just a step. SHRP-108 reposition.
          ============================================================ */}
      <section id="workflow" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                The flow
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                Four stages.
                <br />
                <span className="text-slate-400">All free.</span>
                <br />
                One Custody Record at the end.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Every part of the engagement — collecting keys, building
                with AI, keeping credentials rotated — runs on free
                infrastructure built for client work. You only pay at the
                finish line, when you ship the document.
              </p>
            </div>

            <div className="lg:col-span-7">
              <ol className="space-y-6">
                <FlowStep
                  step={1}
                  title="Collect credentials from your client · free"
                  body="One click sends your client a branded onboarding page with a step-by-step guide for each stack you need (Stripe, GitHub, Vercel, Cloudflare, Supabase, Anthropic, OpenAI, AWS, and more). They paste keys into their own browser, which encrypts them with your public key before sending — SherpaKeys can't read them, only you can."
                />
                <FlowStep
                  step={2}
                  title="Build with AI — without exposing the keys · free"
                  body="Your team ships with Claude, Cursor, or Codex through the SherpaKeys firewall. The AI asks for the API call; SherpaKeys makes it server-side and returns the response. Reads flow silently. Anything that moves money or data pauses for your approval in a real-time dashboard. Every call lands in the audit log."
                />
                <FlowStep
                  step={3}
                  title="Auto-rotate on a schedule · free"
                  body="Mark a credential auto-rotating: every N days SherpaKeys generates a new key at the provider, pushes it to your deployment target, verifies it works, revokes the old one. Failures roll back to the old key with an alert. Production never breaks at 3am because a key expired."
                />
                <FlowStep
                  step={4}
                  title="Hand off with a Go-Live Custody Record · $99"
                  body="At launch, generate the verifiable record — signed, dated, attested, sealed with a public verify URL the client can hit to confirm authenticity. The only paid moment in the workflow. Edits stay free; you can refine the document for as long as the engagement lives."
                />
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST BLOCK — honest tradeoff disclosure
          ============================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                Straight answers
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                We&apos;ll tell you exactly what we can
                <br />
                <span className="text-slate-400">and can&apos;t see.</span>
              </h2>
            </div>
            <div className="lg:col-span-7">
              <p className="text-lg leading-relaxed text-slate-600">
                The firewall, the cryptography, and the approval flow are
                MIT-licensed on GitHub — your client&apos;s security person
                can read every line. Credentials are encrypted in the browser;
                at rest, the vault is zero-knowledge. During an active agent
                call, the server decrypts that one credential just long enough
                to make the request, then zeros it. The model never sees
                plaintext. That&apos;s the honest tradeoff, and it&apos;s
                documented in full in our threat model.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
                <SecurityFact label="Encryption" value="AES-256-GCM" />
                <SecurityFact label="Key derivation" value="Argon2id" />
                <SecurityFact label="Recovery" value="BIP-39 (12 words)" />
                <SecurityFact
                  label="Vault at rest"
                  value="Zero-knowledge"
                  emphasis
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-sm">
                <Link
                  href="/security"
                  className="inline-flex items-center gap-1.5 font-semibold text-sherpa-600 hover:text-sherpa-700"
                >
                  <Lock className="h-4 w-4" /> Read the full threat model{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* What this is — and isn't */}
              <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  What this is — and isn&apos;t
                </div>
                <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>It is a controlled handoff workflow.</strong>{" "}
                      Your client keeps ownership of their credentials; you
                      keep a logged, revocable working window — and proof of
                      both.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      <strong>
                        It is not a compliance certification.
                      </strong>{" "}
                      The Custody Record documents what happened in
                      SherpaKeys — it doesn&apos;t audit your client&apos;s
                      whole stack, and it isn&apos;t a SOC 2.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      <strong>It is not for what you ship.</strong>{" "}
                      SherpaKeys sits between your AI tools and the client&apos;s
                      APIs while you build — it&apos;s not a runtime secrets
                      manager for the app you deliver.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================
          OPEN SOURCE — dark beat
          ============================================================ */}
      <section
        id="opensource"
        className="scroll-mt-24 relative isolate overflow-hidden bg-slate-900 text-white"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950"
        />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sherpa-100 backdrop-blur-sm">
            <Github className="h-3.5 w-3.5" /> Open source
          </div>
          <h2 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            The firewall is open source.
            <br />
            <span className="text-slate-400">
              So your client&apos;s security person can audit it.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-300">
            The MCP firewall, the cryptography, the approval flow — all
            MIT-licensed on GitHub. When a client asks how the AI gets the
            answer without seeing the key, you can send them the code instead
            of a marketing page.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="https://github.com/sdavis30731/sherpa"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:shadow-xl hover:shadow-white/20"
            >
              <Github className="h-4 w-4" /> Read the code on GitHub
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Security architecture <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRICING — SHRP-108: one price. $99 per Custody Record.
          Everything else is unlimited and free. The $19/project and
          $9/vault lines have been deliberately removed from the page;
          the post-handoff client vault is a separate sales motion to a
          separate buyer, not a disclosure to the agency.
          ============================================================ */}
      <section id="pricing" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Pricing
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Everything is free.
              <br />
              <span className="text-slate-400">Except the handoff.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Unlimited client projects. Unlimited credentials. Unlimited
              AI firewall calls. Unlimited auto-rotation. Unlimited
              branded client onboarding. The only paid moment in the
              system is when you generate a Custody Record at handoff.
            </p>
          </div>

          {/* ─── Single hero price card ─── */}
          <div className="mx-auto mt-14 max-w-xl">
            <div className="relative flex flex-col rounded-3xl border-2 border-sherpa-500 bg-gradient-to-br from-sherpa-50/70 via-white to-white p-8 shadow-xl shadow-sherpa-500/15 sm:p-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md shadow-sherpa-500/40">
                One price · the only price
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Go-Live Custody Record
                </h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Pay per record
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="bg-gradient-to-br from-sherpa-600 to-sherpa-700 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
                  $99
                </span>
                <span className="text-sm text-slate-500">
                  / record · billed at generate
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Everything else in the workflow is free, unlimited, no
                card required. Bill your client whatever you want for the
                launch closeout — most agencies bill $750 to $2,500. You
                keep the markup.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet color="sherpa">
                  <strong>Unlimited projects</strong>, credentials, audit
                  log entries
                </PriceBullet>
                <PriceBullet color="sherpa">
                  <strong>AI firewall</strong> + write-action approvals
                </PriceBullet>
                <PriceBullet color="sherpa">
                  <strong>Branded client onboarding</strong> page per
                  engagement
                </PriceBullet>
                <PriceBullet color="sherpa">
                  <strong>Auto-rotation</strong> with rollback on failure
                </PriceBullet>
                <PriceBullet color="sherpa">
                  Browser-encrypted vault · zero-knowledge at rest
                </PriceBullet>
                <PriceBullet color="sherpa">
                  BIP-39 recovery, MIT-licensed firewall
                </PriceBullet>
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-sherpa-500/30 transition hover:shadow-lg hover:shadow-sherpa-500/40"
              >
                <KeyRound className="h-4 w-4" /> Start free — no card{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                No subscriptions. No seat fees. No platform tax.
              </p>
            </div>
          </div>

          {/* ─── Founding cohort callout ─── */}
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-sherpa-200 bg-sherpa-50/40 p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sherpa-500 to-sherpa-600 text-white shadow-md shadow-sherpa-500/30">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sherpa-700">
                  Founding cohort
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                  First 10 agencies who sign up lock founder rates for life.
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  $79 per Custody Record (vs. $99) and a direct line to
                  the founder during your build. We&apos;re selecting the
                  first 10 from free signups based on engagement — no
                  application, no apply form. Just start your first
                  project.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12 text-center">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="text-slate-900">Sherpa</span>
            <span className="text-sherpa-500">Keys</span>
          </div>
          <p className="text-sm text-slate-500">
            Built for the shops that hold other people&apos;s keys — and want
            to be able to prove they held them well.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <Link href="/security" className="hover:text-slate-700">
              Security
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="https://github.com/sdavis30731/sherpa"
              className="hover:text-slate-700"
            >
              Open source
            </Link>
            <span aria-hidden>·</span>
            <Link href="/sample-custody-record.html" className="hover:text-slate-700">
              Sample Custody Record
            </Link>
            <span aria-hidden>·</span>
            <Link href="/launch-readiness" className="hover:text-slate-700">
              Go-Live Test
            </Link>
            <span aria-hidden>·</span>
            <Link href="/login" className="hover:text-slate-700">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ============================================================
   Helper components
   ============================================================ */

/**
 * SHRP-108 — Three-audience benefit card for the "Who wins" section.
 * Each card represents one of the three people who benefit from a
 * Custody Record: the agency, the client, and the client's bankers/
 * investors. Designed to read as a quick scan: eyebrow → bold headline
 * → supporting paragraph.
 */
function WinnerCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sherpa-600">
        {eyebrow}
      </div>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function HeadacheCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sherpa-50 text-sherpa-600 ring-1 ring-sherpa-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900">
        &ldquo;{title}&rdquo;
      </h3>
      <p
        className="mt-2 text-sm leading-relaxed text-slate-600"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

function FlowStep({
  step,
  title,
  body,
}: {
  step: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sherpa-500 to-sherpa-600 text-lg font-bold text-white shadow-md shadow-sherpa-500/30">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {body}
        </p>
      </div>
    </li>
  );
}

function BulletCheck({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sherpa-500" />
      <span>{children}</span>
    </li>
  );
}

function PriceBullet({
  children,
  color = "emerald",
}: {
  children: React.ReactNode;
  color?: "emerald" | "sherpa";
}) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          color === "sherpa" ? "text-sherpa-500" : "text-emerald-500"
        }`}
      />
      <span>{children}</span>
    </li>
  );
}

function SecurityFact({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        emphasis
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-sm font-semibold ${
          emphasis ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   Mock visual — Custody Record preview
   A miniature "this is what your client receives" thumbnail
   that nods at the real sample without re-rendering the whole thing.
   ============================================================ */
function CustodyRecordPreview() {
  return (
    <div className="relative">
      {/* Stacked-paper shadow */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-slate-200 bg-white shadow-md"
      />
      <div
        aria-hidden
        className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl border border-slate-200 bg-white shadow-md"
      />

      {/* Cover page */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        {/* Top gradient band */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-sherpa-700 via-sherpa-600 to-sherpa-500 p-5 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-[10px] font-bold ring-1 ring-white/30">
              NS
            </span>
            <span className="text-xs font-semibold opacity-90">
              Northshore Studio
            </span>
          </div>
          <div className="mt-5 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]">
            Go-Live Credential Custody Record
          </div>
          <div className="mt-2 text-xl font-bold leading-tight">
            Brushfire Coffee
            <br />
            DTC Launch
          </div>
        </div>

        {/* Score card */}
        <div className="-mt-8 mx-5 mb-5 rounded-xl bg-white p-4 shadow-md ring-1 ring-slate-900/5">
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold leading-none text-slate-900">
              89<span className="text-base text-slate-400">/100</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Green · Launch-ready
              </div>
              <div className="mt-0.5 text-[10px] leading-snug text-slate-500">
                7 services. 2 documented exceptions. 3 personnel revocations.
              </div>
            </div>
          </div>
        </div>

        {/* Mini section list */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Includes
          </div>
          <ul className="mt-2 space-y-1.5 text-[11px] text-slate-700">
            {[
              "Stripe · Supabase · GitHub",
              "Vercel · OpenAI · Resend · Cloudflare",
              "Audit log (19 events, timestamped)",
              "Signed methodology + agency principal",
            ].map((line) => (
              <li key={line} className="flex items-center gap-1.5">
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-2 w-2 text-emerald-700" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-[9px] uppercase tracking-wider text-slate-400">
          11 pages · Generated with SherpaKeys
        </div>
      </div>
    </div>
  );
}
