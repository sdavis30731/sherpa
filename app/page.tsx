import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Bot,
  Eye,
  RotateCw,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { EnvAnalyzer } from "./_components/env-analyzer";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-full max-w-5xl px-6 pb-24">
      {/* Top nav */}
      <nav className="flex items-center justify-between py-5">
        <div className="text-lg font-bold text-sherpa-500">Sherpa</div>
        <div className="flex items-center gap-3 text-sm">
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
          Paste your <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-base text-slate-700">.env</code> below. Sherpa identifies every key, flags the dangerous ones, and tells you what to do next.{" "}
          <strong className="text-slate-800">No signup required.</strong>
        </p>
      </section>

      {/* Analyzer — the hero experience */}
      <section className="mx-auto mt-10 max-w-3xl">
        <EnvAnalyzer />
      </section>

      {/* Three pillars (supporting info) */}
      <section className="mt-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-sherpa-600">
            What Sherpa does after you sign up
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Three things, in one place, forever
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Pillar
            icon={<KeyRound className="h-5 w-5" />}
            title="The vault"
            body="Every API key, webhook secret, and connection string — encrypted in your browser before it leaves it. Sherpa never sees the plaintext."
          />
          <Pillar
            icon={<ShieldCheck className="h-5 w-5" />}
            title="The playbooks"
            body="For every service: where to find each key, how to rotate it, what scopes to set, what breaks if you do it wrong. Maintained by us."
          />
          <Pillar
            icon={<Bot className="h-5 w-5" />}
            title="The agent bridge"
            body="Claude, Cursor, and Codex can call APIs on your behalf via MCP — without ever seeing your keys. Sherpa proxies the request server-side."
          />
        </div>
      </section>

      {/* What it feels like (feature highlights) */}
      <section className="mt-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FeatureRow
            icon={<Upload className="h-4 w-4" />}
            title="Import from .env"
            body="Paste a messy .env, Sherpa sorts it out. The cold start is 30 seconds, not an hour."
          />
          <FeatureRow
            icon={<RotateCw className="h-4 w-4" />}
            title="Rotation reminders + guides"
            body="Each key has a per-service rotation interval. When it&apos;s due, Sherpa walks you through it."
          />
          <FeatureRow
            icon={<Eye className="h-4 w-4" />}
            title="Reveal only when you need it"
            body="Click-to-reveal with 10-second auto-hide, copy with 30-second clipboard clear. Click ≠ leak."
          />
          <FeatureRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Risk-flagged at import"
            body="service_role keys with NEXT_PUBLIC_ prefix? sk_live_ in dev? Sherpa shouts before you ship."
          />
        </div>
      </section>

      {/* Pricing — clear, one-time, no surprise */}
      <section className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sherpa-600">
              Pricing
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Free for your first product
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              No credit card, no subscription. When you ship your second
              product and want everything in one Sherpa, pay once.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-sherpa-500">$19</span>
              <span className="text-sm text-slate-500">one-time, lifetime</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Unlimited projects, forever
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                All future features included — no surprise upsells
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                Zero-knowledge: we structurally can&apos;t read your data
              </li>
            </ul>
            <Link
              href="/signup"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-sherpa-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sherpa-600"
            >
              Get started, free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
        <p>
          Built for the people who scaled Everest the first time out with
          Cowork, Cursor, Codex, or Bolt.
        </p>
      </footer>
    </main>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sherpa-50 text-sherpa-500">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sherpa-50 text-sherpa-500">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-600">{body}</p>
      </div>
    </div>
  );
}
