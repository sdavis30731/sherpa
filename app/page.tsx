import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Bot,
  RotateCw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Search,
  Terminal,
} from "lucide-react";
import { EnvAnalyzer } from "./_components/env-analyzer";
import { TopoPattern } from "./_components/topo-pattern";

export default function HomePage() {
  return (
    <main className="min-h-full overflow-x-hidden bg-white">
      {/* ============================================================
          HERO — clarity-first. Plain-language product description so a
          first-time visitor knows what SherpaKeys does in 5 seconds.
          ============================================================ */}
      <div className="relative isolate">
        {/* Gradient wash */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-sherpa-50/70 via-white to-white"
        />

        <div className="mx-auto max-w-5xl px-6">
          {/* Top nav */}
          <nav className="flex items-center justify-between py-5">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight transition hover:opacity-80"
            >
              <span className="text-slate-900">Sherpa</span>
              <span className="text-sherpa-500">Keys</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/security"
                className="hidden font-medium text-slate-600 hover:text-slate-900 sm:inline"
              >
                Security
              </Link>
              <Link
                href="/login"
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-2 font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
              >
                Sign up free
              </Link>
            </div>
          </nav>

          {/* Hero content */}
          <section className="pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sherpa-700 shadow-sm backdrop-blur-sm">
              <KeyRound className="h-3.5 w-3.5" /> The keychain for AI-built apps
            </div>
            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
              Let AI work on your app.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              Don&apos;t hand it{" "}
              <span className="bg-gradient-to-br from-sherpa-500 to-sherpa-700 bg-clip-text text-transparent">
                the keys.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-balance text-xl font-semibold leading-tight tracking-tight text-slate-700 sm:text-2xl">
              AI agents now need access to your app stack. SherpaKeys lets
              them operate safely — without exposing your secrets or giving
              them unchecked power.
            </p>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-600">
              Paste your{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-base text-slate-700">
                .env
              </code>
              . SherpaKeys identifies every key, classifies the risks, walks
              you through rotation, and gives Claude or Cursor a safe way to
              call your APIs — read by default, write only with your explicit
              approval.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
              Built for founders, builders, and vibe coders shipping real apps
              with Claude, Cursor, Bolt, and Vercel.
            </p>
            <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Runs in your browser. Your secrets are never uploaded.
            </p>
          </section>
        </div>
      </div>

      {/* ============================================================
          ANALYZER — glassmorphic card on white
          ============================================================ */}
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/5 sm:p-8">
          <EnvAnalyzer />
        </div>
      </div>

      {/* ============================================================
          WHY THIS MATTERS — context-setting before the product flow
          ============================================================ */}
      <Section background="slate-50">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
            Why this matters
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            You built it. Now it has to survive contact with real users.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            Every real app depends on dozens of API keys, webhook secrets, and
            DNS records — most of them dangerous if misconfigured. A single{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm text-slate-700 ring-1 ring-slate-200">
              NEXT_PUBLIC_
            </code>{" "}
            prefix on the wrong key, a{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm text-slate-700 ring-1 ring-slate-200">
              sk_live_
            </code>{" "}
            in your test environment, an OpenAI key with no spend cap — and
            your launch day becomes the worst day of the year.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            SherpaKeys catches these{" "}
            <strong className="font-semibold text-slate-800">
              before your customers do
            </strong>
            .
          </p>
        </div>
      </Section>

      {/* ============================================================
          5-STEP PRODUCT FLOW — the spine of what SherpaKeys does
          ============================================================ */}
      <Section background="white">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Five steps from messy{" "}
            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-2xl text-slate-700 sm:text-3xl">
              .env
            </code>{" "}
            to launch-ready.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Each step builds on the last. The first two already happened — in
            the analyzer above. Here&apos;s where the rest leads.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FlowCard
            n={1}
            title="Find the mess"
            body="Paste your .env. SherpaKeys parses every line and identifies the service behind each key — Stripe, Supabase, GitHub, OpenAI, AWS, and more."
            icon={<Search className="h-5 w-5" />}
            highlight
          />
          <FlowCard
            n={2}
            title="Understand the keys"
            body="Each key gets a plain-English explanation: what it can do, why it's risky, and whether it's public-by-design or critical-if-leaked."
            icon={<KeyRound className="h-5 w-5" />}
            highlight
          />
          <FlowCard
            n={3}
            title="Fix the risk"
            body="Step-by-step rotation playbooks for every supported service — the exact URL, the exact scopes, the exact pitfalls."
            icon={<RotateCw className="h-5 w-5" />}
          />
          <FlowCard
            n={4}
            title="Store safely"
            body="Encrypted in your browser before it reaches us. We can't read it. Same crypto model as the major password managers."
            icon={<Lock className="h-5 w-5" />}
          />
          <FlowCard
            n={5}
            title="Let AI help safely"
            body="Claude or Cursor can call Stripe, Supabase, or Vercel through SherpaKeys — without ever seeing the secret key."
            icon={<Bot className="h-5 w-5" />}
          />
        </div>
      </Section>

      {/* ============================================================
          STORY 1: ROTATION — deep dive on step 3
          ============================================================ */}
      <Section background="slate-50">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <EyebrowChip tone="amber" icon={<RotateCw className="h-3.5 w-3.5" />}>
              Step 3 · Fix the risk
            </EyebrowChip>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              &ldquo;Where do I even go to rotate this?&rdquo;
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              You know you&apos;re supposed to rotate that GitHub PAT. The
              problem is: Settings → Developer Settings → Tokens (classic) →
              Generate New → set 14 scope checkboxes you don&apos;t remember
              picking → paste into 3 deployment dashboards → pray nothing
              broke. Multiply by 8 services and you just lost a Saturday.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              SherpaKeys keeps a hand-maintained playbook for every service —
              <strong className="font-semibold text-slate-800"> the exact
              URL, the exact scopes, the exact pitfalls</strong>, and a
              rotation checklist that takes 90 seconds instead of 90 minutes.
              When a key is due, we tell you. When it&apos;s rotated, we
              update everywhere it&apos;s referenced.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <RotationBullet text="Step-by-step rotation guides for Stripe, GitHub, Supabase, and Vercel (more shipping weekly)" />
              <RotationBullet text="Per-service rotation intervals — 90 days for AWS, 180 for Stripe, whatever the vendor recommends" />
              <RotationBullet text="A &lsquo;Needs attention&rsquo; widget on every vault home so nothing slips past 6 months" />
            </ul>
          </div>
          <div className="sm:col-span-5">
            <RotationMockup />
          </div>
        </div>
      </Section>

      {/* ============================================================
          STORY 2: SECURITY — deep dive on step 4
          ============================================================ */}
      <Section background="white">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <SecurityMockup />
          </div>
          <div className="sm:col-span-7">
            <EyebrowChip tone="emerald" icon={<Lock className="h-3.5 w-3.5" />}>
              Step 4 · Store safely
            </EyebrowChip>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Even <span className="italic">we</span> can&apos;t read your keys.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Most password managers can technically decrypt your data if they
              wanted to (or if they got hacked). SherpaKeys can&apos;t. Your
              passphrase never leaves your device. Your keys are encrypted in
              your browser with a key derived from that passphrase. By the
              time anything reaches our servers, it&apos;s already
              indistinguishable from random noise.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              We call this{" "}
              <strong className="font-semibold text-slate-800">
                zero-knowledge
              </strong>
              . It&apos;s the same proven architecture used by the major
              password managers, built on the same cryptography that protects
              HTTPS. If our database leaked tomorrow, the attacker would get
              ciphertext and nothing else.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <SecurityFact label="Encryption" value="AES-256-GCM" />
              <SecurityFact label="Key derivation" value="Argon2id" />
              <SecurityFact label="Recovery" value="BIP-39 (12 words)" />
              <SecurityFact
                label="Server can decrypt?"
                value="No. Ever."
                emphasis
              />
            </div>
            <Link
              href="/security"
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-sherpa-600 hover:text-sherpa-700"
            >
              How the cryptography works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* ============================================================
          STORY 3: MCP — deep dive on step 5
          ============================================================ */}
      <Section background="slate-50">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <EyebrowChip tone="sherpa" icon={<Bot className="h-3.5 w-3.5" />}>
              Step 5 · Let AI help safely
            </EyebrowChip>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Let your AI assistant help. Without holding the keys.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Half of debugging a vibe-coded app is sanity-checking config:
              &ldquo;Is my webhook even configured?&rdquo; &ldquo;Am I using
              the right Supabase key in the frontend?&rdquo; &ldquo;Which env
              vars are missing in production?&rdquo; The old way to get help
              meant pasting your secret keys into chat — where they live in
              the transcript forever, ship to model providers, and may end
              up in a screenshot.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              SherpaKeys is an{" "}
              <strong className="font-semibold text-slate-800">
                MCP server
              </strong>
              . Your AI asks SherpaKeys to make the diagnostic call.
              SherpaKeys uses your key server-side, returns the answer, and{" "}
              <strong className="font-semibold text-slate-800">
                the model never touches the secret.
              </strong>{" "}
              Read-only by default. Write actions require your explicit
              approval (coming with v1.1).
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <RotationBullet text="Works with Claude (Cowork, Code, Desktop), Cursor, Codex — any MCP client" />
              <RotationBullet text="Read-only by default; write actions gated by human approval, dollar caps, and dry-run previews" />
              <RotationBullet text="Scoped tokens: production-only, single-project, expiring" />
              <RotationBullet text="Every agent call lands in your activity log with the prompt that triggered it" />
            </ul>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                What you can ask today
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                <li>&ldquo;Is my Stripe webhook endpoint configured correctly?&rdquo;</li>
                <li>&ldquo;Is my frontend using the anon key or service_role?&rdquo;</li>
                <li>&ldquo;Show which env vars are missing in Vercel production.&rdquo;</li>
                <li>&ldquo;Does this GitHub token have more repo access than it needs?&rdquo;</li>
                <li>&ldquo;Is a hard spend cap set on my OpenAI key?&rdquo;</li>
              </ul>
            </div>
          </div>
          <div className="sm:col-span-5">
            <MCPMockup />
          </div>
        </div>
      </Section>

      {/* ============================================================
          BENEFITS GRID — white background
          ============================================================ */}
      <Section background="white">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
            Everything in one place
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for the 30-second cold start
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BenefitCard
            icon={<Search className="h-5 w-5" />}
            title="Risk-flagged at import"
            body="service_role with NEXT_PUBLIC_? sk_live_ in dev? SherpaKeys shouts before you ship."
          />
          <BenefitCard
            icon={<RotateCw className="h-5 w-5" />}
            title="Rotation reminders"
            body="Per-service intervals. Overdue widget on the dashboard. Walk-throughs for each."
          />
          <BenefitCard
            icon={<Lock className="h-5 w-5" />}
            title="Reveal-and-clear"
            body="10-second auto-hide, 30-second clipboard clear. A click is never a leak."
          />
          <BenefitCard
            icon={<Terminal className="h-5 w-5" />}
            title="Activity log"
            body="Every reveal, copy, edit, and agent call — timestamped and filterable."
          />
        </div>
      </Section>

      {/* ============================================================
          BRAND VOICE — DARK NAVY centerpiece. "Dude. Where are my keys?!"
          is the campaign moment; climbing metaphor stripped.
          ============================================================ */}
      <div className="relative isolate overflow-hidden bg-slate-900 text-white">
        {/* Background decorative rings — abstract, not mountain-coded */}
        <TopoPattern
          variant="rings"
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/2 -z-10 h-[800px] w-[800px] -translate-y-1/2 text-white/[0.05]"
        />
        <TopoPattern
          variant="rings"
          aria-hidden
          className="pointer-events-none absolute -left-48 -bottom-32 -z-10 h-[600px] w-[600px] text-sherpa-500/[0.08]"
        />
        {/* Subtle gradient overlay so text always reads */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900"
        />

        <div className="mx-auto max-w-4xl px-6 py-28 text-center sm:py-32">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-100 backdrop-blur-sm">
            <KeyRound className="h-3.5 w-3.5" /> A familiar moment
          </div>
          <h2 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            &ldquo;Dude. Where are{" "}
            <span className="bg-gradient-to-br from-sherpa-300 to-sherpa-500 bg-clip-text text-transparent">
              my keys?!
            </span>
            &rdquo;
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-balance text-lg leading-relaxed text-slate-300">
            Every founder who shipped a real app by talking to Claude or
            Cursor has had this exact moment of panic — staring at a deploy
            screen, a Stripe dashboard, or six open browser tabs full of
            half-rotated secrets. SherpaKeys is the tool you wish you had
            the first time you Googled{" "}
            <em className="italic text-slate-200">
              &ldquo;is my supabase service role key supposed to be in
              NEXT_PUBLIC_?&rdquo;
            </em>{" "}
            at 11pm before a launch.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:shadow-xl hover:shadow-white/20"
            >
              <KeyRound className="h-4 w-4" /> Start free
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              How the cryptography works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
          PRICING — three-tier cards. Free + Lifetime live today;
          Pro shows as Coming with v1.1 with waitlist signup.
          ============================================================ */}
      <Section background="white">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Free forever. Pay once. Or scale up.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            The core — vault, Go-Live Check, AI Firewall, rotation playbooks —
            is free for one app, permanently. $19 once unlocks unlimited
            projects. A monthly Pro tier covers teams and heavy AI agent
            usage. Same zero-knowledge encryption on every tier.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ─── Free tier ─── */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Free forever</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
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
              Be launch-ready on one app, permanently. No card. No timer.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              <PriceBullet>1 project, unlimited credentials</PriceBullet>
              <PriceBullet>All playbooks + Go-Live Check</PriceBullet>
              <PriceBullet>AI Firewall (write-action approval)</PriceBullet>
              <PriceBullet>100 MCP agent calls / month</PriceBullet>
              <PriceBullet>7-day audit log retention</PriceBullet>
              <PriceBullet>Zero-knowledge encryption</PriceBullet>
            </ul>
            <Link
              href="/signup"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
            >
              <KeyRound className="h-4 w-4" /> Start free
            </Link>
          </div>

          {/* ─── Hacker Lifetime ─── */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-sherpa-400 bg-gradient-to-br from-sherpa-50 via-white to-white p-7 shadow-lg shadow-sherpa-500/10 transition hover:shadow-xl hover:shadow-sherpa-500/20">
            <TopoPattern
              variant="rings"
              aria-hidden
              className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 text-sherpa-400/10"
            />
            <div className="absolute -top-3 right-6 rounded-full bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-sherpa-500/40">
              Coming with v1.1
            </div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Hacker Lifetime</h3>
                <span className="rounded-full bg-sherpa-100 px-2.5 py-0.5 text-xs font-semibold text-sherpa-700 ring-1 ring-sherpa-200">
                  Pay once
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="bg-gradient-to-br from-sherpa-600 to-sherpa-700 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
                  $19
                </span>
                <span className="text-sm text-slate-500">one-time</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Launch insurance for every app you&apos;ll ever build.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <PriceBullet color="sherpa">
                  <strong>Everything in Free</strong>, plus:
                </PriceBullet>
                <PriceBullet color="sherpa">Unlimited projects</PriceBullet>
                <PriceBullet color="sherpa">Unlimited MCP agent tokens</PriceBullet>
                <PriceBullet color="sherpa">
                  5,000 MCP agent calls / month
                </PriceBullet>
                <PriceBullet color="sherpa">
                  90-day audit log retention
                </PriceBullet>
                <PriceBullet color="sherpa">Priority email support</PriceBullet>
              </ul>
              <Link
                href="/pro-waitlist?tier=lifetime"
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sherpa-500 bg-white px-4 py-3 text-sm font-semibold text-sherpa-600 transition hover:bg-sherpa-50"
              >
                Join the early-access list
              </Link>
            </div>
          </div>

          {/* ─── Pro (coming soon) ─── */}
          <div className="group relative overflow-hidden rounded-3xl border border-slate-300 bg-slate-50 p-7 shadow-sm transition hover:shadow-md">
            <div className="absolute -top-3 right-6 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-md">
              Coming with v1.1
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Pro</h3>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                Teams
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight text-slate-900">
                $12
              </span>
              <span className="text-sm text-slate-500">
                / mo billed annually
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              For teams and apps where AI agents are doing real work.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              <PriceBullet>
                <strong>Everything in Lifetime</strong>, plus:
              </PriceBullet>
              <PriceBullet>Unlimited MCP agent calls</PriceBullet>
              <PriceBullet>Team vaults — invite collaborators</PriceBullet>
              <PriceBullet>SSO (Google, GitHub, Microsoft)</PriceBullet>
              <PriceBullet>Unlimited audit log + CSV export</PriceBullet>
              <PriceBullet>Priority email + chat support</PriceBullet>
            </ul>
            <Link
              href="/pro-waitlist"
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Join the early-access list
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          We&apos;re an indie team, not a subscription factory. Free is
          permanent. Existing Lifetime buyers are grandfathered with
          unlimited MCP calls and the most generous reading of every
          promise we&apos;ve made.
        </p>
      </Section>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="text-slate-900">Sherpa</span>
            <span className="text-sherpa-500">Keys</span>
          </div>
          <p className="text-sm text-slate-500">
            The keychain for AI-built apps.
          </p>
          <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-500">
            <Link href="/security" className="hover:text-slate-700">
              Security
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

// ============================================================
// Small components
// ============================================================

/**
 * Section wrapper that handles the alternating-background rhythm.
 * Use background="white" or "slate-50" to switch.
 */
function Section({
  background,
  children,
}: {
  background: "white" | "slate-50";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        background === "slate-50"
          ? "border-y border-slate-200 bg-slate-50"
          : "bg-white"
      }
    >
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">{children}</div>
    </div>
  );
}

function EyebrowChip({
  tone,
  icon,
  children,
}: {
  tone: "sherpa" | "amber" | "emerald";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles = {
    sherpa: "bg-sherpa-50 text-sherpa-700 ring-sherpa-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[tone];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ${styles}`}
    >
      {icon} {children}
    </div>
  );
}

function RotationBullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span>{text}</span>
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

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sherpa-50 to-sherpa-100 text-sherpa-600 ring-1 ring-sherpa-200/60">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600">{body}</p>
    </div>
  );
}

/**
 * FlowCard — one numbered step in the 5-step product flow.
 *
 * `highlight` marks the steps already demonstrated by the analyzer above
 * (steps 1 and 2). It gives those cards a subtle green-tint border and a
 * "Just demonstrated above" tag, so visitors immediately tie the abstract
 * flow back to what they just saw.
 */
function FlowCard({
  n,
  title,
  body,
  icon,
  highlight = false,
}: {
  n: number;
  title: string;
  body: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? "border-emerald-200 ring-1 ring-emerald-100"
          : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            highlight
              ? "bg-emerald-500 text-white"
              : "bg-sherpa-500 text-white"
          }`}
        >
          {n}
        </span>
        <span className="text-sherpa-600">{icon}</span>
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
      {highlight && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> Just demonstrated above
        </div>
      )}
    </div>
  );
}

// ============================================================
// Static illustrations (all inline CSS/SVG, no images)
// ============================================================

function RotationMockup() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-900/5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          Rotate Stripe secret key
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          Due in 12 days
        </span>
      </div>
      <ol className="space-y-2.5 text-sm">
        <Step done text="Open dashboard.stripe.com → Developers → API keys" />
        <Step done text="Click Roll key on the live secret" />
        <Step
          current
          text="Paste the new sk_live_… here — SherpaKeys updates Vercel, Railway, and your local .env"
        />
        <Step text="Revoke the old key (90s window so production doesn't blink)" />
        <Step text="Mark rotated" />
      </ol>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Last rotated 168
        days ago
      </div>
    </div>
  );
}

function Step({
  text,
  done,
  current,
}: {
  text: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : current
              ? "bg-sherpa-500 text-white ring-4 ring-sherpa-100"
              : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span
        className={
          done
            ? "text-slate-400 line-through"
            : current
              ? "font-semibold text-slate-900"
              : "text-slate-600"
        }
      >
        {text}
      </span>
    </li>
  );
}

function SecurityMockup() {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 font-mono text-xs shadow-2xl shadow-slate-900/30 ring-1 ring-slate-700/50">
      <div className="mb-3 flex items-center gap-2 text-slate-400">
        <Lock className="h-3.5 w-3.5" /> stored in sherpakeys database
      </div>
      <div className="rounded-xl bg-slate-800/80 p-3 text-slate-300 ring-1 ring-slate-700/50">
        <div className="text-slate-500">label: STRIPE_SECRET_KEY</div>
        <div className="mt-1 break-all text-emerald-300">
          ciphertext: 7f4c2a9e1d6b0f83a2c4d7e9b1f0a3c5
          <br />e8d2b9f1a4c7d0e3b6f9a2c5d8e1b4f7
          <br />c0a3d6e9b2f5a8c1d4e7b0f3a6c9d2e5
          <br />b8f1a4c7d0e3b6f9a2c5d8e1b4f7c0a3...
        </div>
        <div className="mt-2 text-slate-500">
          iv: 9b4f2a7c1e8d6b0f
          <br />algorithm: AES-256-GCM
        </div>
      </div>
      <div className="mt-3 text-[11px] leading-relaxed text-slate-400">
        This is what SherpaKeys&apos;s servers see. Decryption happens in your
        browser, with a key derived from a passphrase only you know.
      </div>
    </div>
  );
}

function MCPMockup() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-900/5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          You, to Claude
        </div>
        <div className="text-sm text-slate-800">
          &ldquo;Is my Stripe webhook configured correctly?&rdquo;
        </div>
      </div>
      <div className="ml-6 rounded-2xl border border-sherpa-200 bg-sherpa-50 p-4 shadow-md shadow-sherpa-500/10">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sherpa-700">
          <Bot className="h-3 w-3" /> Claude → SherpaKeys MCP
        </div>
        <div className="font-mono text-xs text-slate-700">
          sherpa_call_api(
          <br />&nbsp;&nbsp;service: &ldquo;stripe&rdquo;,
          <br />&nbsp;&nbsp;endpoint: &ldquo;webhook_endpoints&rdquo;,
          <br />&nbsp;&nbsp;method: &ldquo;list&rdquo;
          <br />)
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Read-only. Claude doesn&apos;t see the key. Claude doesn&apos;t
          know the key.
        </div>
      </div>
      <div className="ml-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-md shadow-emerald-500/10">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> SherpaKeys → Stripe → Claude
        </div>
        <div className="font-mono text-[11px] leading-relaxed text-emerald-900">
          1 endpoint · status: enabled
          <br />url: https://api.yourapp.com/stripe
          <br />listening for: payment_intent.succeeded,
          <br />invoice.paid, customer.subscription.deleted
        </div>
        <div className="mt-2 text-[11px] text-emerald-700">
          &ldquo;Your webhook looks healthy. It&apos;s listening for the
          three events your code references.&rdquo;
        </div>
      </div>
    </div>
  );
}
