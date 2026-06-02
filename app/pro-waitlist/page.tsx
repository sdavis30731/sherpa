/**
 * /pro-waitlist — SHRP-048
 *
 * Capture page for Pro early-access list signups. Linked from the
 * homepage Pro pricing card. Server component renders the layout;
 * a client island handles the form submission.
 */

import Link from "next/link";
import { Building2, Users, Sparkles, ArrowLeft } from "lucide-react";
import { ProWaitlistForm } from "./_components/pro-waitlist-form";

export const metadata = {
  title: "Pro early access — SherpaKeys",
  description:
    "Join the waitlist for SherpaKeys Pro — the AI firewall for engineering teams. Centralized approval queue, SSO, team vaults, audit log export.",
};

export default function ProWaitlistPage() {
  return (
    <main className="mx-auto min-h-full max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight transition hover:opacity-80"
        >
          <span className="text-slate-900">Sherpa</span>
          <span className="text-sherpa-500">Keys</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>
      </div>

      {/* Hero */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-sherpa-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sherpa-700">
          <Sparkles className="h-3.5 w-3.5" /> Pro · Early access
        </div>
        <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          The AI firewall for{" "}
          <span className="bg-gradient-to-br from-sherpa-500 to-sherpa-700 bg-clip-text text-transparent">
            engineering teams.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          If your team is letting Claude, Cursor, or Codex touch production
          APIs, SherpaKeys Pro gives you a centralized approval queue, team
          vaults, SSO, and the compliance trail your auditors will ask for
          when they figure out what your engineers are doing.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
          Drop your details below and we&apos;ll be in touch as Pro features
          ship. We&apos;ll also ask you what you actually need so we build the
          right thing.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/5 sm:p-8">
        <ProWaitlistForm />
      </div>

      {/* What's coming */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
          What Pro will include
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Built for the moment AI agents go from helpful to autonomous.
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProFeature
            icon={<Building2 className="h-4 w-4" />}
            title="Team vaults"
            body="Shared credentials across collaborators with role-based access. Onboard a new engineer in 30 seconds; offboard cleanly when someone leaves."
          />
          <ProFeature
            icon={<Users className="h-4 w-4" />}
            title="Centralized approval queue"
            body="When a junior engineer's Cursor instance tries to push a live schema change, the tech lead sees it in their Slack and approves with one click."
          />
          <ProFeature
            icon={<Sparkles className="h-4 w-4" />}
            title="SSO + compliance"
            body="Sign in via Google, GitHub, or Microsoft. Unlimited audit log retention. CSV export for compliance reviews. Auditors stop asking questions."
          />
          <ProFeature
            icon={<Sparkles className="h-4 w-4" />}
            title="Unlimited MCP volume"
            body="No call ceiling. Heavy agent loops, deep tool chains, multi-step debugging sessions — all run without quota friction."
          />
        </div>
      </div>

      {/* Footer */}
      <p className="mt-10 text-center text-xs text-slate-400">
        SherpaKeys — the AI firewall for AI-built apps.{" "}
        <Link href="/security" className="hover:text-slate-600">
          Security architecture
        </Link>
      </p>
    </main>
  );
}

function ProFeature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sherpa-50 text-sherpa-600 ring-1 ring-sherpa-200/60">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
