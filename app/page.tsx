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
  ClipboardList,
  KeyRound,
} from "lucide-react";
import { EnvAnalyzer } from "./_components/env-analyzer";
import { TopNav } from "./_components/top-nav";

/**
 * Homepage (SHRP-093) — agency-positioned.
 *
 * Promoted from /agencies; the vibe-coder pitch is gone. The wedge is
 * one sentence: "Take on client credentials. Not client risk."
 *
 * Page structure:
 *   1. Sticky top nav with anchor links to each section below
 *   2. Hero — pitch (left) + .env analyzer (right, reframed for agencies)
 *   3. Pillar chips — Build safely · Hand off cleanly · Prove it
 *   4. Headaches — 4 cards in agency voice
 *   5. Workflow — Intake → Build → Handoff
 *   6. Custody Record — the deliverable
 *   7. Trust block — honest tradeoff disclosure (mediated agent bridge)
 *   8. Founding cohort — 10-agency apply CTA
 *   9. Open source — dark beat ("your client's security person can audit")
 *  10. Pricing — Free for 1 workspace + Agency $299/mo
 *  11. Footer
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
            <p className="mt-6 max-w-2xl text-balance text-xl leading-tight tracking-tight text-slate-600 sm:text-2xl">
              Your client&apos;s Stripe key, Supabase service_role, AWS
              credentials — usable by Claude, Cursor, and Codex while you
              build. Never visible to them. Fully accounted for when you
              hand off.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/pro-waitlist?tier=agency"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sherpa-500/30 transition hover:shadow-lg hover:shadow-sherpa-500/40"
              >
                <ClipboardList className="h-4 w-4" /> Apply to founding cohort{" "}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sample-custody-record.html"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileCheck2 className="h-4 w-4" /> See a sample Custody Record
              </Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Browser-encrypted vault. AI never sees plaintext secrets.
            </p>
          </section>
        </div>
      </div>

      {/* ============================================================
          ANALYZER — its own beat, centered. Headline + analyzer card
          + caption stacked vertically so the tall analyzer doesn't
          create awkward whitespace next to the hero pitch.
          ============================================================ */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Pre-handoff diagnostic
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Run it on a client&apos;s .env.
              <br />
              <span className="text-slate-400">
                Get a Go-Live Check in 30 seconds.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              The same engine that drives the Custody Record. Runs entirely
              in your browser — nothing uploaded, no signup, no PII captured.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/5 sm:p-6">
            <EnvAnalyzer />
          </div>
        </div>
      </section>

      {/* ============================================================
          PILLAR CHIPS — Build safely leads, the other two support
          ============================================================ */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          {/* Lead — Build safely */}
          <Link
            href="#workflow"
            className="group flex items-start gap-5 rounded-3xl border-2 border-sherpa-200 bg-gradient-to-br from-sherpa-50/70 to-white p-6 transition hover:border-sherpa-300 hover:from-sherpa-50 sm:p-7"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sherpa-500 to-sherpa-600 text-white shadow-md shadow-sherpa-500/30 sm:h-12 sm:w-12">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                The wedge · Pillar 1
              </div>
              <div className="mt-1 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                Build safely — your AI gets the answer, never the key
              </div>
              <div className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                Your team ships with Claude, Cursor, and Codex through the
                SherpaKeys firewall. The AI sees the API response. It never
                sees the secret.
              </div>
            </div>
            <ArrowRight className="ml-auto hidden h-5 w-5 shrink-0 text-sherpa-400 transition group-hover:text-sherpa-600 sm:block" />
          </Link>

          {/* Supporting — Hand off cleanly + Prove it */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <PillarChip
              order="2"
              title="Hand off cleanly"
              body="Branded Go-Live Custody Record. The client signs off knowing exactly what happened."
              anchor="#custody"
            />
            <PillarChip
              order="3"
              title="Prove it"
              body="Open-source firewall on GitHub. Audit log of every access, every actor, every minute."
              anchor="#opensource"
            />
          </div>
        </div>
      </div>

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
          WORKFLOW — Intake → Build → Handoff
          ============================================================ */}
      <section id="workflow" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                The workflow
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                Client keeps control.
                <br />
                <span className="text-slate-400">You keep moving.</span>
                <br />
                Everyone keeps receipts.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Three stages, designed so the credential graph stays clean
                from kickoff to launch — without slowing your team down on
                the inside.
              </p>
            </div>

            <div className="lg:col-span-7">
              <ol className="space-y-6">
                <FlowStep
                  step={1}
                  title="Intake"
                  body="The client adds their credentials to a dedicated client workspace — encrypted in their browser before anything leaves it — or you run intake together on a call. Either way: no keys in email, Slack, or a shared doc, ever."
                />
                <FlowStep
                  step={2}
                  title="Build"
                  body="Your team ships with Claude, Cursor, or Codex through the SherpaKeys firewall. The AI asks for the API call; SherpaKeys makes it server-side and returns the response. Reads flow silently. Anything that moves money or data pauses for your approval. Every call lands in the audit log with a timestamp and an actor."
                />
                <FlowStep
                  step={3}
                  title="Handoff"
                  body="On go-live day you deliver a branded Go-Live Custody Record: every credential inventoried, risk-scored, accounted for. Rotation done, your access revoked, the audit log exported. The client signs off knowing exactly what happened — because it's all written down."
                />
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CUSTODY RECORD — the deliverable
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
                The Go-Live Custody Record
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                The handoff document that makes you look like
                <br />
                <span className="text-slate-400">the bigger agency.</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Every project ends with a signed, dated, branded document the
                client can file, forward to their accountant, or show their
                next developer. It&apos;s the difference between &ldquo;trust
                us, we cleaned up&rdquo; and an artifact.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                <BulletCheck>
                  <strong>Your branding, not ours</strong> — white-label
                  reports on the Agency tier
                </BulletCheck>
                <BulletCheck>
                  Per-credential inventory with risk scoring — the same engine
                  as the analyzer in the hero
                </BulletCheck>
                <BulletCheck>
                  Rotation + revocation checklist, completed and timestamped
                </BulletCheck>
                <BulletCheck>
                  Full audit log export — every access, every approval, every
                  actor
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
          FOUNDING COHORT
          ============================================================ */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <div className="overflow-hidden rounded-3xl border border-sherpa-200 bg-gradient-to-br from-sherpa-50 via-white to-white p-8 shadow-lg shadow-sherpa-500/5 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Limited · first cohort
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              We&apos;re onboarding 10 founding agencies.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
              Use SherpaKeys on a real client project. Get Agency-tier
              features — multi-client workspaces, white-label branding,
              branded Custody Records — free for 3 months, and a
              founding-agency price after. In exchange: a 30-minute call
              after your first handoff, and honest feedback on the report
              your client received.
            </p>
            <ul className="mt-7 space-y-2.5 text-base text-slate-800">
              <Bullet>
                Built for 2–8 person shops that take possession of client
                production credentials and ship with AI tools.
              </Bullet>
              <Bullet>
                Agency tier is normally $299 / month. Founding agencies lock
                a lower rate, permanently.
              </Bullet>
              <Bullet>
                Direct line to the founder during the cohort. We listen and
                we ship.
              </Bullet>
            </ul>
            <Link
              href="/pro-waitlist?tier=agency"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-sherpa-500/30 transition hover:shadow-lg hover:shadow-sherpa-500/40"
            >
              <ClipboardList className="h-4 w-4" /> Apply as a founding agency{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-slate-500">
              We&apos;ll ask about your team, the AI tools you ship with, and
              how you currently receive client credentials. Take 3 minutes.
            </p>
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
          PRICING — Free + Agency (Solo/Pro killed in SHRP-093)
          ============================================================ */}
      <section id="pricing" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Pricing
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Free for one client. Agency rate after that.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Built for 2–8 person shops, not subscription-factory teams.
              Same browser-encrypted vault on every tier.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Free</h3>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  No card
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight text-slate-900">
                  $0
                </span>
                <span className="text-sm text-slate-500">/ forever</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                One real client workspace, permanently. Try it on your next
                project before you commit.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet>1 client workspace</PriceBullet>
                <PriceBullet>AI firewall + write-action approvals</PriceBullet>
                <PriceBullet>100 MCP calls / month</PriceBullet>
                <PriceBullet>30-day audit log</PriceBullet>
                <PriceBullet>Standard Custody Record template</PriceBullet>
                <PriceBullet>BIP-39 recovery</PriceBullet>
              </ul>
              <Link
                href="/signup"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
              >
                <KeyRound className="h-4 w-4" /> Join waitlist
              </Link>
            </div>

            {/* Agency */}
            <div className="relative flex flex-col rounded-3xl border-2 border-sherpa-500 bg-gradient-to-br from-sherpa-50/70 via-white to-white p-8 shadow-xl shadow-sherpa-500/15 transition hover:shadow-2xl hover:shadow-sherpa-500/25">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md shadow-sherpa-500/40">
                For agencies
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Agency</h3>
                <span className="rounded-full bg-sherpa-100 px-2.5 py-0.5 text-[11px] font-semibold text-sherpa-700 ring-1 ring-sherpa-200">
                  Client work
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="bg-gradient-to-br from-sherpa-600 to-sherpa-700 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
                  $299
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                or $2,990 / year (save $598)
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Multi-client workspaces, white-label, branded Custody Records.
                Built for the shop that holds other people&apos;s keys.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet color="sherpa">
                  <strong>Everything in Free</strong>, plus:
                </PriceBullet>
                <PriceBullet color="sherpa">
                  Unlimited client workspaces
                </PriceBullet>
                <PriceBullet color="sherpa">Unlimited MCP calls</PriceBullet>
                <PriceBullet color="sherpa">1-year audit log</PriceBullet>
                <PriceBullet color="sherpa">
                  White-label Custody Records (your logo)
                </PriceBullet>
                <PriceBullet color="sherpa">
                  Reusable client intake templates
                </PriceBullet>
                <PriceBullet color="sherpa">Priority support</PriceBullet>
              </ul>
              <Link
                href="/pro-waitlist?tier=agency"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
              >
                Apply to founding cohort
              </Link>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Founding cohort: 3 months free + locked-in lower rate
              </p>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-slate-500">
            Signups paused while SherpaKeys LLC finalizes setup. Founding
            cohort applications open today.
          </p>
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

function PillarChip({
  order,
  title,
  body,
  anchor,
}: {
  order: string;
  title: string;
  body: string;
  anchor: string;
}) {
  return (
    <Link
      href={anchor}
      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sherpa-300 hover:bg-sherpa-50/40"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sherpa-50 text-sm font-bold text-sherpa-700 ring-1 ring-sherpa-200 group-hover:bg-sherpa-100">
        {order}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{body}</div>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-sherpa-500" />
    </Link>
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
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
