/**
 * /thanks-for-upgrading — SHRP-045
 *
 * Where Stripe redirects after a successful Lifetime checkout.
 * Server component: reads the session_id from the query string for
 * future analytics / receipt linking, shows a clean confirmation.
 */

import Link from "next/link";
import { CheckCircle2, KeyRound, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Welcome to Lifetime — SherpaKeys",
  description:
    "Your SherpaKeys Lifetime upgrade is confirmed. Unlimited projects, 5,000 MCP agent calls/month, 90-day audit log retention.",
};

export default async function ThanksForUpgradingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold tracking-tight">
          <span className="text-slate-900">Sherpa</span>
          <span className="text-sherpa-500">Keys</span>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-8 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-100">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/40">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Welcome to Lifetime. 🎉
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-700">
          Your payment went through. Your account is upgraded.
          You&apos;ve got:
        </p>
        <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
          <Bullet>Unlimited projects</Bullet>
          <Bullet>Unlimited MCP agent tokens</Bullet>
          <Bullet>5,000 MCP agent calls / month</Bullet>
          <Bullet>90-day audit log retention</Bullet>
          <Bullet>Priority email support</Bullet>
          <Bullet>
            Every future base-service improvement — included forever
          </Bullet>
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/vault"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40"
          >
            <KeyRound className="h-4 w-4" /> Open my vault
          </Link>
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to home <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Stripe just emailed you a receipt. Save it — it&apos;s also your
          proof of purchase if you ever need to reach support.
        </p>
        {session_id && (
          <p className="mt-2 text-[10px] font-mono text-slate-400">
            Receipt reference: {session_id}
          </p>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Questions? Email{" "}
        <a
          href="mailto:support@sherpakeys.com"
          className="text-slate-600 hover:underline"
        >
          support@sherpakeys.com
        </a>{" "}
        — every Lifetime customer gets a human reply.
      </p>
    </main>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}
