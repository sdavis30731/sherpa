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

export default function HomePage() {
  return (
    <main className="mx-auto min-h-full max-w-5xl px-6 pb-24">
      {/* Top nav */}
      <nav className="flex items-center justify-between py-5">
        <div className="text-lg font-bold text-sherpa-500">Sherpa</div>
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
            className="rounded-md bg-sherpa-500 px-4 py-2 font-semibold text-white shadow-sm hover:bg-sherpa-600"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mt-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-sherpa-50 px-3 py-1 text-xs font-medium text-sherpa-700">
          <ShieldCheck className="h-3.5 w-3.5" /> The credentials OS for vibe coders
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          Dude. Where are{" "}
          <span className="text-sherpa-500">my keys?!</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          You shipped a real product with Claude, Cursor, or Bolt. Now you have
          API keys, webhook secrets, and DNS records scattered across six
          dashboards, three <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-base text-slate-700">.env</code>
          {" "}files, and one panicked group chat. Sherpa is the one place where
          all of it lives — encrypted so even we can&apos;t read it.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
          Start here. Paste a <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm text-slate-700">.env</code> and we&apos;ll tell you which keys are dangerous, where to rotate them, and what each one actually does.{" "}
          <strong className="text-slate-700">No signup required.</strong>
        </p>
      </section>

      {/* Analyzer — the hero experience */}
      <section className="mx-auto mt-10 max-w-3xl">
        <EnvAnalyzer />
      </section>

      {/* ---------------- STORY SECTION 1: ROTATION ---------------- */}
      <section className="mt-28">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <RotateCw className="h-3.5 w-3.5" /> Rotation, without the rabbit hole
            </div>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              &ldquo;Where do I even go to rotate this?&rdquo;
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              You know you&apos;re supposed to rotate that GitHub PAT. The
              problem is: Settings → Developer Settings → Tokens (classic) →
              Generate New → set 14 scope checkboxes you don&apos;t remember
              picking → paste into 3 deployment dashboards → pray nothing
              broke. Multiply by 8 services and you just lost a Saturday.
            </p>
            <p className="mt-4 text-lg text-slate-600">
              Sherpa keeps a hand-maintained playbook for every service —
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
      </section>

      {/* ---------------- STORY SECTION 2: SECURITY ---------------- */}
      <section className="mt-28 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <SecurityMockup />
          </div>
          <div className="sm:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <Lock className="h-3.5 w-3.5" /> Encrypted before it leaves your browser
            </div>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              Even <span className="italic">we</span> can&apos;t read your keys.
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Most password managers can technically decrypt your data if they
              wanted to (or if they got hacked). Sherpa can&apos;t. Your
              passphrase never leaves your device. Your keys are encrypted in
              your browser with a key derived from that passphrase. By the
              time anything reaches our servers, it&apos;s already
              indistinguishable from random noise.
            </p>
            <p className="mt-4 text-lg text-slate-600">
              We call this <strong className="font-semibold text-slate-800">zero-knowledge</strong>. It&apos;s the same proven architecture used by the major password managers, built on the same cryptography that protects HTTPS. If our database leaked tomorrow, the attacker would get ciphertext and nothing else.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <SecurityFact label="Encryption" value="AES-256-GCM" />
              <SecurityFact label="Key derivation" value="Argon2id" />
              <SecurityFact label="Recovery" value="BIP-39 (12 words)" />
              <SecurityFact label="Server can decrypt?" value="No. Ever." emphasis />
            </div>
            <Link
              href="/security"
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-sherpa-600 hover:text-sherpa-700"
            >
              How the cryptography works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- STORY SECTION 3: MCP AGENT BRIDGE ---------------- */}
      <section className="mt-28">
        <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-sherpa-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sherpa-700">
              <Bot className="h-3.5 w-3.5" /> Diagnose and assist — without seeing your keys
            </div>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              Let your AI assistant help. Without holding the keys.
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Half of debugging a vibe-coded app is sanity-checking config:
              &ldquo;Is my webhook even configured?&rdquo; &ldquo;Am I using
              the right Supabase key in the frontend?&rdquo; &ldquo;Which env
              vars are missing in production?&rdquo; The old way to get help
              meant pasting your secret keys into chat — where they live in
              the transcript forever, ship to model providers, and may end
              up in a screenshot.
            </p>
            <p className="mt-4 text-lg text-slate-600">
              Sherpa is an{" "}
              <strong className="font-semibold text-slate-800">
                MCP server
              </strong>
              . Your AI asks Sherpa to make the diagnostic call. Sherpa uses
              your key server-side, returns the answer, and{" "}
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
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
      </section>

      {/* ---------------- BENEFITS GRID (denser features) ---------------- */}
      <section className="mt-28">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-sherpa-600">
            Everything in one place
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Built for the 30-second cold start
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BenefitCard
            icon={<Search className="h-5 w-5" />}
            title="Risk-flagged at import"
            body="service_role with NEXT_PUBLIC_? sk_live_ in dev? Sherpa shouts before you ship."
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
      </section>

      {/* ---------------- PRICING ---------------- */}
      <section className="mt-28">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-sherpa-600">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            The core is free. Forever.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
            Vault, playbooks, risk-flag analysis, rotation reminders, the MCP
            agent bridge, the activity log — included on the free tier,
            permanently. No trial timer. No card on file. When (and only
            when) you outgrow it, there&apos;s an upgrade waiting.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Free tier */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Free forever</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                No card needed
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-900">$0</span>
              <span className="text-sm text-slate-500">/ forever</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Everything you need to ship and protect one real product.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                1 project, unlimited credentials inside it
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                All playbooks, all risk rules, all rotation guides
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                MCP agent bridge — let Claude/Cursor call APIs safely
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Full audit log + rotation reminders
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Zero-knowledge encryption — same as the paid tier
              </li>
            </ul>
            <Link
              href="/signup"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-sherpa-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sherpa-600"
            >
              <KeyRound className="h-4 w-4" /> Start free
            </Link>
          </div>

          {/* Lifetime upgrade */}
          <div className="relative rounded-2xl border-2 border-sherpa-300 bg-gradient-to-br from-sherpa-50 to-white p-6 shadow-sm">
            <div className="absolute -top-3 right-6 rounded-full bg-sherpa-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Optional upgrade
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Lifetime</h3>
              <span className="rounded-full bg-sherpa-100 px-2.5 py-0.5 text-xs font-semibold text-sherpa-700">
                Pay once
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-sherpa-600">$19</span>
              <span className="text-sm text-slate-500">one-time</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              For when you&apos;re juggling more than one product.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sherpa-500" />
                <strong>Everything in Free</strong>, plus:
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sherpa-500" />
                Unlimited projects
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sherpa-500" />
                Unlimited MCP agent tokens
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sherpa-500" />
                Base services remain included forever — future add-ons optional
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sherpa-500" />
                Priority support
              </li>
            </ul>
            <Link
              href="/signup?upgrade=lifetime"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-sherpa-500 bg-white px-4 py-2.5 text-sm font-semibold text-sherpa-600 hover:bg-sherpa-50"
            >
              Get lifetime access
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          We&apos;re an indie team, not a subscription factory. Free tier is
          permanent. Optional upgrades fund the work.
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
        <p>
          Built for the people who scaled Everest the first time out with
          Cowork, Cursor, Codex, or Bolt.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link href="/security" className="hover:text-slate-600">
            Security
          </Link>
          <span aria-hidden>·</span>
          <Link href="/login" className="hover:text-slate-600">
            Log in
          </Link>
          <span aria-hidden>·</span>
          <Link href="/signup" className="hover:text-slate-600">
            Sign up
          </Link>
        </div>
      </footer>
    </main>
  );
}

// ---------------- Small components ----------------

function RotationBullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span>{text}</span>
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
      className={`rounded-lg border p-3 ${
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sherpa-50 text-sherpa-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600">{body}</p>
    </div>
  );
}

// ---------------- Static illustrations (no images, all CSS) ----------------

function RotationMockup() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          Rotate Stripe secret key
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          Due in 12 days
        </span>
      </div>
      <ol className="space-y-2.5 text-sm">
        <Step done text="Open dashboard.stripe.com → Developers → API keys" />
        <Step done text="Click Roll key on the live secret" />
        <Step
          current
          text="Paste the new sk_live_… here — Sherpa updates Vercel, Railway, and your local .env"
        />
        <Step text="Revoke the old key (90s window so production doesn't blink)" />
        <Step text="Mark rotated" />
      </ol>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Last rotated 168 days ago
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
    <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 font-mono text-xs shadow-md">
      <div className="mb-3 flex items-center gap-2 text-slate-400">
        <Lock className="h-3.5 w-3.5" /> stored in sherpa database
      </div>
      <div className="rounded-md bg-slate-800 p-3 text-slate-300">
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
        This is what Sherpa&apos;s servers see. Decryption happens in your
        browser, with a key derived from a passphrase only you know.
      </div>
    </div>
  );
}

function MCPMockup() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          You, to Claude
        </div>
        <div className="text-sm text-slate-800">
          &ldquo;Is my Stripe webhook configured correctly?&rdquo;
        </div>
      </div>
      <div className="ml-6 rounded-2xl border border-sherpa-200 bg-sherpa-50 p-4 shadow-md">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sherpa-700">
          <Bot className="h-3 w-3" /> Claude → Sherpa MCP
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
      <div className="ml-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-md">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Sherpa → Stripe → Claude
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
