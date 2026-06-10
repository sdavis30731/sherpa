"use client";

/**
 * /signup (SHRP-066) — paused.
 *
 * New account creation is disabled while SherpaKeys' legal entity (LLC)
 * is being formed via Stripe Atlas and the Terms of Service / Privacy
 * Policy are drafted. We are not willing to accept anyone's real
 * production API keys without that foundation in place.
 *
 * This page replaces the magic-link signup form with a launch waitlist
 * gate. Email submits to /api/pro-waitlist (which only requires email).
 *
 * Still working:
 *   - /login — existing accounts (Steve's) can still authenticate.
 *   - /  — the .env analyzer runs fully in browser, no PII, no signup.
 *
 * To re-enable signups: revert this file to the prior magic-link version
 * (git log will show the SHRP-003 implementation) AND turn "Enable new
 * sign-ups" back ON in Supabase → Auth → Providers as the second layer.
 */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { ShieldCheck, KeyRound, Bot, Clock } from "lucide-react";

// Next.js requires useSearchParams() to be wrapped in a Suspense boundary
// so static generation can bail out cleanly. The default export wraps the
// actual gate in <Suspense>; the gate itself reads ?intent=import.
export default function SignupPage() {
  return (
    <React.Suspense fallback={<SignupGateFallback />}>
      <SignupGate />
    </React.Suspense>
  );
}

function SignupGateFallback() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <div className="text-center text-sm text-slate-500">Loading…</div>
    </main>
  );
}

function SignupGate() {
  const params = useSearchParams();
  const cameFromImport = params.get("intent") === "import";

  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          use_case: cameFromImport
            ? "Came from .env analyzer (intent=import)"
            : "Came from /signup gate",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Something went wrong.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
          <Clock className="h-3.5 w-3.5" /> Pre-launch · Signups paused
        </div>
        <h1 className="text-3xl font-bold leading-tight text-slate-900">
          We&apos;re not ready for your keys yet.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          SherpaKeys is in pre-launch. We&apos;re forming our LLC and
          finalizing our Terms of Service and Privacy Policy before we&apos;ll
          accept any real production credentials. Join the waitlist — we&apos;ll
          email you the moment signups open.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Join the launch waitlist</CardTitle>
        </CardHeader>
        <CardBody>
          {sent ? (
            <Callout tone="success" title="You're on the list">
              We&apos;ll email <strong>{email}</strong> the moment SherpaKeys
              opens for signups.
            </Callout>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {cameFromImport && (
                <Callout tone="info">
                  Your pasted .env stays in your browser — nothing was
                  uploaded. We&apos;ll re-surface it when you come back after
                  signups open.
                </Callout>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {error && <Callout tone="danger">{error}</Callout>}
              <Button type="submit" fullWidth disabled={loading || !email}>
                {loading ? "Adding you..." : "Join the waitlist"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-sherpa-600 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </form>
          )}
        </CardBody>
      </Card>

      <div className="mt-8 space-y-3">
        <Reassure
          icon={<ShieldCheck className="h-4 w-4" />}
          text="The .env analyzer at sherpakeys.com runs fully in your browser — no signup needed, no PII captured."
        />
        <Reassure
          icon={<KeyRound className="h-4 w-4" />}
          text="When we open, your keys will be encrypted in your browser before they ever reach our servers."
        />
        <Reassure
          icon={<Bot className="h-4 w-4" />}
          text="Once live, Claude and Cursor will use your keys without ever seeing them."
        />
      </div>
    </main>
  );
}

function Reassure({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-600">
      <span className="mt-0.5 text-sherpa-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
