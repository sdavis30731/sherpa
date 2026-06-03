import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Bot,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { EnvAnalyzer } from "./_components/env-analyzer";
import { TopoPattern } from "./_components/topo-pattern";

export default function HomePage() {
  return (
    <main className="min-h-full overflow-x-hidden bg-white">
      {/* ============================================================
          HERO — slim, opinionated, one paragraph max.
          ============================================================ */}
      <div className="relative isolate">
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

          {/* Hero — now four pieces only: eyebrow, headline, subhead, trust line */}
          <section className="pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sherpa-700 shadow-sm backdrop-blur-sm">
              <KeyRound className="h-3.5 w-3.5" /> The AI firewall for AI-built apps
            </div>
            <h1 className="text-balance text-5xl font-bold leading-[1.02] tracking-tight text-slate-900 sm:text-7xl">
              Let AI work on your app.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              Don&apos;t hand it{" "}
              <span className="bg-gradient-to-br from-sherpa-500 to-sherpa-700 bg-clip-text text-transparent">
                the keys.
              </span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance text-xl leading-tight tracking-tight text-slate-700 sm:text-2xl">
              AI agents now need access to your app stack. SherpaKeys lets
              them operate safely — without exposing your secrets or giving
              them unchecked power.
            </p>
            <p className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Runs in your browser. Your secrets are never uploaded.
            </p>
          </section>
        </div>
      </div>

      {/* ============================================================
          ANALYZER — the wedge. Paste an .env, get a Go-Live score.
          ============================================================ */}
      <div className="mx-auto max-w-3xl px-6 pb-28">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/5 sm:p-8">
          <EnvAnalyzer />
        </div>
      </div>

      {/* ============================================================
          AI FIREWALL FEATURE — single combined section
          merging the MCP + security stories into one focused beat.
          ============================================================ */}
      <Section background="slate-50">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-sherpa-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sherpa-700 ring-1 ring-sherpa-200">
              <Bot className="h-3.5 w-3.5" /> The AI firewall
            </div>
            <h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
              Your AI assistant gets the answer.
              <br />
              <span className="text-slate-500">It never gets the key.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Claude asks SherpaKeys to call Stripe, Supabase, or GitHub.
              SherpaKeys uses your credential server-side, returns the
              response, and zeros it back out. Write actions — anything
              that costs money or moves data — require your explicit
              browser approval before they execute.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
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
              className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-sherpa-600 hover:text-sherpa-700"
            >
              Read the full security architecture{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="sm:col-span-5">
            <MCPMockup />
          </div>
        </div>
      </Section>

      {/* ============================================================
          BRAND VOICE — dark navy centerpiece, "Dude. Where are my keys?!"
          ============================================================ */}
      <div className="relative isolate overflow-hidden bg-slate-900 text-white">
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
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900"
        />

        <div className="mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
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
          <p className="mx-auto mt-10 max-w-2xl text-balance text-lg leading-relaxed text-slate-300">
            Every founder who shipped a real app by talking to Claude or
            Cursor has had this exact moment of panic. SherpaKeys is the
            tool you wish you had the first time you Googled{" "}
            <em className="italic text-slate-200">
              &ldquo;is my supabase service role key supposed to be in
              NEXT_PUBLIC_?&rdquo;
            </em>{" "}
            at 11pm before a launch.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
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
          PRICING — three cards. Lifetime paused (SHRP-054) so its CTA
          goes to the early-access waitlist instead of Stripe.
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
            The core is free for one app, permanently. Same zero-knowledge
            encryption on every tier.
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
              Be launch-ready on one app, permanently.
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

          {/* ─── Hacker Lifetime (paused) ─── */}
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
                <h3 className="text-lg font-bold text-slate-900">
                  Hacker Lifetime
                </h3>
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
                <PriceBullet color="sherpa">
                  Unlimited MCP agent tokens
                </PriceBullet>
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
          We&apos;re an indie team, not a subscription factory.
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
            The AI firewall for AI-built apps.
          </p>
          <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-500">
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

// ============================================================
// Helper components — only what the slimmer page still uses
// ============================================================

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
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">{children}</div>
    </div>
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

// ============================================================
// Mockups — single representative visual on the firewall section
// ============================================================

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
          <br />
          &nbsp;&nbsp;service: &ldquo;stripe&rdquo;,
          <br />
          &nbsp;&nbsp;endpoint: &ldquo;webhook_endpoints&rdquo;,
          <br />
          &nbsp;&nbsp;method: &ldquo;list&rdquo;
          <br />)
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Read-only. Claude doesn&apos;t see the key.
        </div>
      </div>
      <div className="ml-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-md shadow-emerald-500/10">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> SherpaKeys → Stripe → Claude
        </div>
        <div className="font-mono text-[11px] leading-relaxed text-emerald-900">
          1 endpoint · status: enabled
          <br />
          url: https://api.yourapp.com/stripe
          <br />
          listening for: payment_intent.succeeded,
          <br />
          invoice.paid, customer.subscription.deleted
        </div>
        <div className="mt-2 text-[11px] text-emerald-700">
          &ldquo;Your webhook looks healthy.&rdquo;
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Lock icon import (used implicitly via Lucide above) — kept for future
// rotation/vault sections we may re-add post-launch.
// ============================================================
void Lock;
