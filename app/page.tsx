import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Search,
  Bot,
  Clock,
  GitCompare,
  Github,
} from "lucide-react";
import { EnvAnalyzer } from "./_components/env-analyzer";
import { TopNav } from "./_components/top-nav";

/**
 * Homepage (SHRP-058) — three-pillar spine.
 *
 * Why does SherpaKeys exist?
 *   To empower you with organized, maintained, and secured credentials
 *   you can use as you build.
 *
 * Wedge: secured and still usable as you vibe code. No fear.
 *
 * Page structure:
 *   1. Hero       — "Vibe code without fear." + analyzer wedge
 *   2. Headaches  — four pains every solo founder shipping with AI knows
 *   3. Secured    — pillar 1: AI firewall + zero-knowledge crypto
 *   4. Organized  — pillar 2: one vault, one source of truth
 *   5. Maintained — pillar 3: rotation, audit log, env-sync
 *   6. Open source— the firewall is MIT on GitHub
 *   7. Pricing    — three tiers (lifetime paused, see SHRP-054)
 *   8. Footer
 *
 * Anchor IDs match the labels in app/_components/top-nav.tsx so the
 * desktop nav links and mobile menu both jump to the right section.
 */

export default function HomePage() {
  return (
    <main className="min-h-full overflow-x-clip bg-white">
      {/* ============================================================
          STICKY TOP NAV — stays in view as the visitor anchor-jumps
          between sections. Translucent white with a backdrop blur so
          content underneath softly shows through. The thin border
          appears against any section background.
          ============================================================ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6">
          <TopNav />
        </div>
      </header>

      {/* ============================================================
          HERO + ANALYZER
          ============================================================ */}
      <div className="relative isolate">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-sherpa-50/70 via-white to-white"
        />
        <div className="mx-auto max-w-6xl px-6">
          <section className="grid grid-cols-1 gap-12 pt-10 pb-20 sm:pt-16 sm:pb-28 lg:grid-cols-12 lg:gap-12">
            {/* Pitch column */}
            <div className="lg:col-span-7 lg:pt-6">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sherpa-700 shadow-sm backdrop-blur-sm">
                <KeyRound className="h-3.5 w-3.5" /> The AI firewall for vibe
                coders
              </div>
              <h1 className="text-balance text-5xl font-bold leading-[1.02] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Vibe code{" "}
                <span className="bg-gradient-to-br from-sherpa-500 to-sherpa-700 bg-clip-text text-transparent">
                  without fear
                </span>
                .
              </h1>
              <p className="mt-6 max-w-xl text-balance text-xl leading-tight tracking-tight text-slate-600 sm:text-2xl">
                Your Stripe key, your Supabase service_role, your AWS
                credentials — usable by Claude, Cursor, and Cowork. Never
                visible to them.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sherpa-500/30 transition hover:shadow-lg hover:shadow-sherpa-500/40"
                >
                  Join the waitlist <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#secured"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  See it work
                </Link>
              </div>
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Browser-encrypted vault. AI never sees plaintext secrets.
              </p>
            </div>

            {/* Analyzer column — the live wedge demo */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/5 sm:p-6">
                <EnvAnalyzer />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ============================================================
          PILLAR-INTRO STRIP — Secured leads (it's the wedge); Organized
          and Maintained are the supporting depth below at smaller weight.
          Visual hierarchy reinforces the "one thing, with two reinforcements"
          read instead of "three equal pillars."
          ============================================================ */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          {/* Lead — Secured (the wedge) */}
          <Link
            href="#secured"
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
                Secured — your AI gets the answer, never the key
              </div>
              <div className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                The MCP firewall is what SherpaKeys is built around. Claude,
                Cursor, Cowork, and Codex call your APIs through it — and
                never see the secret.
              </div>
            </div>
            <ArrowRight className="ml-auto hidden h-5 w-5 shrink-0 text-sherpa-400 transition group-hover:text-sherpa-600 sm:block" />
          </Link>

          {/* Supporting — Organized + Maintained */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <PillarChip
              order="2"
              title="Organized"
              body="One vault. One source of truth."
              anchor="#organized"
            />
            <PillarChip
              order="3"
              title="Maintained"
              body="Rotation, audit, env-sync — handled."
              anchor="#maintained"
            />
          </div>
        </div>
      </div>

      {/* ============================================================
          HEADACHES — four pains every solo founder knows
          ============================================================ */}
      <section
        id="headaches"
        className="scroll-mt-24 border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Coder headaches
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              You came here because of one of these.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Every solo founder shipping with AI knows these moments.
              SherpaKeys removes them before they happen.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <HeadacheCard
              icon={Search}
              title="Where did I put that key?"
              body=".env files, 1Password, a Slack DM to yourself, that screenshot you saved just in case. Now your build's broken and the prod key is anywhere but here."
            />
            <HeadacheCard
              icon={Bot}
              title="Can I trust Claude with my Stripe key?"
              body="You need AI to ship faster. You also know what happens if a service_role key ends up in a chat log, an issue comment, or a public repo."
            />
            <HeadacheCard
              icon={Clock}
              title="Did I rotate that one in time?"
              body="The breach notice said 'rotate immediately.' Three weeks later you're still hoping nobody guessed which keys you forgot."
            />
            <HeadacheCard
              icon={GitCompare}
              title="Why does it work locally and not on Vercel?"
              body="The variable is there. Just with a different name. Or a stale value. Or it's missing. Or you set it in Preview but not Production."
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          PILLAR 1 — SECURED  (the AI firewall + crypto facts + boundary)
          ============================================================ */}
      <section id="secured" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                Pillar 1 · Secured
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                Your AI gets the answer.
                <br />
                <span className="text-slate-400">It never gets the key.</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Claude — or Cursor, or Cowork, or Codex — asks SherpaKeys to
                call Stripe, Supabase, GitHub. SherpaKeys uses your credential
                server-side, returns the response, and zeros it back out.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Write actions — anything that costs money or moves data —
                pause for your approval first. Reads stream through silently.
                You stay in flow; SherpaKeys stays in the loop.
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

              {/* The honest threat-model carve-out for active agent sessions.
                  Steve's call: don't bury this — the buyer should see it
                  on the homepage, not just on /security. */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Active agent sessions — the honest tradeoff
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  When your AI agent makes a call, the server decrypts that one
                  credential server-side just long enough to make the request,
                  then zeros the key. The model never sees plaintext. But for
                  the brief moment of that call, the server <em>can</em> read
                  that one credential — so active sessions trust our server
                  more than your at-rest vault does. Every call is logged,
                  rate-limited, and revocable instantly. Full threat model on{" "}
                  <Link
                    href="/security"
                    className="font-semibold text-sherpa-600 hover:text-sherpa-700"
                  >
                    /security
                  </Link>
                  .
                </p>
              </div>

              {/* The boundary — what we explicitly are not */}
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  What SherpaKeys is not
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Not for your customer-facing AI runtime. Not a password
                  manager for human passwords. Not an AI agent itself.
                  SherpaKeys sits between your AI tools and the APIs you&apos;d
                  never paste your secret keys into — for when you&apos;re
                  building, not for what you ship.
                </p>
              </div>

              <Link
                href="/security"
                className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-sherpa-600 hover:text-sherpa-700"
              >
                Read the full security architecture
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="lg:col-span-6">
              <FirewallStoryboard />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PILLAR 2 — ORGANIZED  (one vault)
          ============================================================ */}
      <section
        id="organized"
        className="scroll-mt-24 border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 lg:order-1 lg:col-span-6">
              <VaultMockup />
            </div>
            <div className="order-1 lg:order-2 lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                Pillar 2 · Organized
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                One vault.
                <br />
                <span className="text-slate-400">One source of truth.</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Paste your .env once. SherpaKeys detects which key belongs to
                which service, flags the ones AI should never see in plain
                text, and organizes everything by project. The
                .env-file-archaeology stops.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                <BulletCheck>
                  Auto-detects Stripe, Supabase, GitHub, AWS, OpenAI,
                  Anthropic, Resend, Vercel, and more
                </BulletCheck>
                <BulletCheck>
                  Risk badges flag credentials that should never reach an AI
                  chat in clear text
                </BulletCheck>
                <BulletCheck>
                  Copy with auto-clear — clipboard wipes after 30 seconds
                </BulletCheck>
                <BulletCheck>
                  Recovery phrase (12 words) — lose your password, keep your
                  vault
                </BulletCheck>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PILLAR 3 — MAINTAINED  (rotation, audit, env-sync)
          ============================================================ */}
      <section id="maintained" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
                Pillar 3 · Maintained
              </p>
              <h2 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
                Keys age.
                <br />
                <span className="text-slate-400">
                  SherpaKeys ages them for you.
                </span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Rotation reminders. Lifecycle tracking. Env-var sync between
                your laptop, Vercel, Railway, and Render. The maintenance you
                forget about until it bites — SherpaKeys remembers and nudges.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-700">
                <BulletCheck>
                  Step-by-step rotation playbooks — Stripe, Supabase, GitHub,
                  Vercel, more
                </BulletCheck>
                <BulletCheck>
                  Audit log — every access, approval, and rotation,
                  timestamped
                </BulletCheck>
                <BulletCheck>
                  <span>
                    Auto-rotation{" "}
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                      v1.1
                    </span>{" "}
                    · env-var sync across Vercel/Railway/Render{" "}
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                      v1.2
                    </span>
                  </span>
                </BulletCheck>
              </ul>
            </div>
            <div className="lg:col-span-6">
              <LifecycleMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          OPEN SOURCE — dark beat, GitHub call
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
            <span className="text-slate-400">So you can audit it yourself.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-slate-300">
            The MCP firewall, the cryptography, the approval flow — all
            MIT-licensed on GitHub. If you can&apos;t trust a closed-source
            key vault, you can read every line of the part that talks to
            your AI.
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
          PRICING (SHRP-061) — four tiers + Team/Enterprise footer note.
          $19 Lifetime is gone; subscription-only signals seriousness.
          All paid tiers route to /pro-waitlist?tier=X until LLC is live.
          ============================================================ */}
      <section id="pricing" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
              Pricing
            </p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Free for one app. Real prices when you scale.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Browser-encrypted vault on every tier. The free tier is full
              protection for your first project — not a teaser.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md">
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
                For your first real app, permanently.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet>1 project, unlimited credentials</PriceBullet>
                <PriceBullet>AI firewall + write-action approvals</PriceBullet>
                <PriceBullet>100 MCP calls / month</PriceBullet>
                <PriceBullet>7-day audit log</PriceBullet>
                <PriceBullet>BIP-39 recovery</PriceBullet>
              </ul>
              <Link
                href="/signup"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
              >
                <KeyRound className="h-4 w-4" /> Join the waitlist
              </Link>
            </div>

            {/* Solo */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Solo</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  Indie
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight text-slate-900">
                  $19
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                or $190 / year (save $38)
              </p>
              <p className="mt-3 text-sm text-slate-600">
                The indie founder running one real app with AI.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet>
                  <strong>Everything in Free</strong>, plus:
                </PriceBullet>
                <PriceBullet>Unlimited projects</PriceBullet>
                <PriceBullet>5,000 MCP calls / month</PriceBullet>
                <PriceBullet>30-day audit log</PriceBullet>
                <PriceBullet>Rotation reminders</PriceBullet>
                <PriceBullet>Email support</PriceBullet>
              </ul>
              <Link
                href="/pro-waitlist?tier=solo"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Join waitlist
              </Link>
            </div>

            {/* Pro — most popular */}
            <div className="relative flex flex-col rounded-3xl border-2 border-sherpa-500 bg-gradient-to-br from-sherpa-50/70 via-white to-white p-7 shadow-xl shadow-sherpa-500/15 transition hover:shadow-2xl hover:shadow-sherpa-500/25">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md shadow-sherpa-500/40">
                Most popular
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Pro</h3>
                <span className="rounded-full bg-sherpa-100 px-2.5 py-0.5 text-[11px] font-semibold text-sherpa-700 ring-1 ring-sherpa-200">
                  Power user
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="bg-gradient-to-br from-sherpa-600 to-sherpa-700 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
                  $49
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                or $490 / year (save $98)
              </p>
              <p className="mt-3 text-sm text-slate-600">
                When AI is operating real production systems for you.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet color="sherpa">
                  <strong>Everything in Solo</strong>, plus:
                </PriceBullet>
                <PriceBullet color="sherpa">Unlimited MCP calls</PriceBullet>
                <PriceBullet color="sherpa">90-day audit log</PriceBullet>
                <PriceBullet color="sherpa">Priority approvals</PriceBullet>
                <PriceBullet color="sherpa">
                  Auto-rotation (v1.1)
                </PriceBullet>
                <PriceBullet color="sherpa">
                  Env-var sync (v1.2)
                </PriceBullet>
                <PriceBullet color="sherpa">Priority support</PriceBullet>
              </ul>
              <Link
                href="/pro-waitlist?tier=pro"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
              >
                Join waitlist
              </Link>
            </div>

            {/* Agency */}
            <div className="flex flex-col rounded-3xl border border-slate-300 bg-slate-50 p-7 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Agency</h3>
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  For agencies
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight text-slate-900">
                  $299
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                or $2,990 / year (save $598)
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Building for clients, not just yourself.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet>
                  <strong>Everything in Pro</strong>, plus:
                </PriceBullet>
                <PriceBullet>Multi-client workspaces</PriceBullet>
                <PriceBullet>White-label branding</PriceBullet>
                <PriceBullet>Branded Go-Live Reports (PDF)</PriceBullet>
                <PriceBullet>1-year audit log</PriceBullet>
                <PriceBullet>Priority response</PriceBullet>
              </ul>
              <Link
                href="/pro-waitlist?tier=agency"
                className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Talk to us
              </Link>
            </div>
          </div>

          {/* Team + Enterprise — soft mention below the four main tiers */}
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Team</h4>
                  <span className="text-xs text-slate-500">
                    $19 / seat / mo · 3-seat min
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Shared vaults, SSO (Google · GitHub · Microsoft), team
                  policies, 1-year audit log.
                </p>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Enterprise
                  </h4>
                  <span className="text-xs text-slate-500">Custom</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  On-prem deployment, SAML, compliance reviews, dedicated
                  support, custom retention.
                </p>
              </div>
            </div>
            <Link
              href="/pro-waitlist?tier=team"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sherpa-600 hover:text-sherpa-700"
            >
              Talk to us about Team or Enterprise
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Paid tiers join the waitlist while SherpaKeys LLC finalizes
            setup. Free is live today.
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
            Secured and still usable as you vibe code. No fear.
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
            <Link href="/login" className="hover:text-slate-700">
              Log in
            </Link>
            <span aria-hidden>·</span>
            <Link href="/signup" className="hover:text-slate-700">
              Sign up
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
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
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
   Mockups — one per pillar
   ============================================================ */

function FirewallStoryboard() {
  return (
    <div className="space-y-3">
      {/* Step 1 — email arrives */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          <span>Inbox · 1 new</span>
          <span>2:14 pm</span>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sherpa-500 to-sherpa-600 text-[10px] font-bold text-white">
              SK
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="truncate text-[12px] font-semibold text-slate-900">
                  SherpaKeys
                </div>
                <div className="shrink-0 text-[10px] text-slate-400">
                  noreply@sherpakeys.com
                </div>
              </div>
              <div className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
                Approve write action: stripe/customers
              </div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                An AI agent wants to do something. Approve in your browser?
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                Review and approve →
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-2 pl-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        <span className="h-3 w-px bg-slate-300" />
        <span>You click the email</span>
      </div>

      {/* Step 2 — approval page */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          <div className="ml-2 truncate rounded bg-white px-2 py-0.5 text-[9px] text-slate-500 ring-1 ring-slate-200">
            sherpakeys.com/approve/9a0a4ecf…
          </div>
        </div>
        <div className="bg-amber-50 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-800">
          ⏱ Awaiting your decision · 58 min left
        </div>
        <div className="px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Proposed action
          </div>
          <div className="mt-1.5 rounded-lg bg-slate-50 p-2.5 font-mono text-[11px] text-slate-900 ring-1 ring-slate-200">
            POST stripe/customers
            <br />
            <span className="text-slate-500">
              email = sarah@example.com
            </span>
          </div>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Amount
          </div>
          <div className="mt-0.5 text-xl font-bold tracking-tight text-red-700">
            $48.00
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="inline-flex items-center justify-center gap-1 rounded-lg border-2 border-slate-300 bg-white py-1.5 text-[11px] font-semibold text-slate-700">
              Reject
            </div>
            <div className="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 py-1.5 text-[11px] font-semibold text-white shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              Approve & execute
            </div>
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-2 pl-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        <span className="h-3 w-px bg-slate-300" />
        <span>SherpaKeys decrypts key server-side, makes the call</span>
      </div>

      {/* Step 3 — approved + executed */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-md shadow-emerald-500/10">
        <div className="flex items-center gap-1.5 border-b border-emerald-100 bg-emerald-100/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Approved · Executed
        </div>
        <div className="px-4 py-3">
          <div className="font-mono text-[11px] leading-relaxed text-emerald-900">
            <span className="text-emerald-600">200 OK</span> ·
            <span className="ml-1 text-slate-500">created customer</span>
            <br />
            id: cus_UcqBi541zF9OqV
            <br />
            email: sarah@example.com
          </div>
          <div className="mt-2 text-[10px] italic text-emerald-700">
            Claude got the response. Claude never saw your Stripe key.
          </div>
        </div>
      </div>
    </div>
  );
}

function VaultMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          sherpakeys-app · production
        </div>
        <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <ShieldCheck className="h-3 w-3" /> Encrypted
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        <VaultRow
          mark="ST"
          name="STRIPE_SECRET_KEY"
          value="sk_live_•••••••••••JK"
          risk="critical"
        />
        <VaultRow
          mark="SB"
          name="SUPABASE_SERVICE_ROLE"
          value="eyJhbGc•••••••••••0xQ"
          risk="critical"
        />
        <VaultRow
          mark="GH"
          name="GITHUB_PAT"
          value="ghp_•••••••••••MnP"
          risk="high"
        />
        <VaultRow
          mark="OA"
          name="OPENAI_API_KEY"
          value="sk-proj-•••••••••2Xy"
          risk="high"
        />
        <VaultRow
          mark="RS"
          name="RESEND_API_KEY"
          value="re_•••••••••••wQ"
          risk="medium"
        />
        <VaultRow
          mark="SB"
          name="SUPABASE_ANON_KEY"
          value="eyJhbGc•••••••••••dF8"
          risk="public"
        />
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium text-slate-500">
        6 credentials · 2 critical · 2 high · 1 medium · 1 public-by-design
      </div>
    </div>
  );
}

function VaultRow({
  mark,
  name,
  value,
  risk,
}: {
  mark: string;
  name: string;
  value: string;
  risk: "critical" | "high" | "medium" | "public";
}) {
  const riskStyle = {
    critical: "bg-red-50 text-red-700 ring-red-200",
    high: "bg-orange-50 text-orange-700 ring-orange-200",
    medium: "bg-amber-50 text-amber-700 ring-amber-200",
    public: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[risk];
  const riskLabel = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    public: "Public",
  }[risk];

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
        {mark}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-[12px] font-semibold text-slate-900">
          {name}
        </div>
        <div className="truncate font-mono text-[11px] text-slate-500">
          {value}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${riskStyle}`}
      >
        {riskLabel}
      </span>
    </div>
  );
}

function LifecycleMockup() {
  return (
    <div className="space-y-3">
      {/* Rotation reminder */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-md shadow-amber-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Rotation overdue · 7 days
            </div>
            <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
              STRIPE_SECRET_KEY
            </div>
            <div className="mt-1 text-xs leading-relaxed text-amber-900">
              Last rotated 97 days ago. Stripe recommends 90 days for
              production keys.
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
              Start rotation playbook <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-900/5">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Audit log · today
        </div>
        <div className="divide-y divide-slate-100">
          <AuditRow
            time="2:14 pm"
            actor="Claude (Cowork)"
            action="Approved"
            target="POST stripe/customers"
            tone="ok"
          />
          <AuditRow
            time="1:47 pm"
            actor="You"
            action="Rotated"
            target="GITHUB_PAT"
            tone="info"
          />
          <AuditRow
            time="11:02 am"
            actor="Cursor"
            action="Read"
            target="OPENAI_API_KEY"
            tone="muted"
          />
          <AuditRow
            time="9:18 am"
            actor="Claude (Desktop)"
            action="Read"
            target="SUPABASE_ANON_KEY"
            tone="muted"
          />
        </div>
      </div>

      {/* Env sync — coming soon */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-sherpa-500" />
            <div className="text-sm font-semibold text-slate-900">
              Env-var sync
            </div>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            Coming v1.2
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Push the same source-of-truth values to Vercel, Railway, and Render
          — one click, no more &ldquo;works locally&rdquo; mysteries.
        </p>
      </div>
    </div>
  );
}

function AuditRow({
  time,
  actor,
  action,
  target,
  tone,
}: {
  time: string;
  actor: string;
  action: string;
  target: string;
  tone: "ok" | "info" | "muted";
}) {
  const actionStyle = {
    ok: "text-emerald-700",
    info: "text-sherpa-700",
    muted: "text-slate-500",
  }[tone];

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-[11px]">
      <div className="w-14 shrink-0 text-slate-400">{time}</div>
      <div className="w-28 shrink-0 truncate font-medium text-slate-700 sm:w-32">
        {actor}
      </div>
      <div className={`w-16 shrink-0 font-semibold ${actionStyle}`}>
        {action}
      </div>
      <div className="min-w-0 flex-1 truncate font-mono text-slate-600">
        {target}
      </div>
    </div>
  );
}
