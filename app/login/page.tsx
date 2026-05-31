"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/vault";

  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
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
        <h1 className="text-3xl font-bold text-slate-900">Log in to SherpaKeys</h1>
        <p className="mt-2 text-sm text-slate-600">We&apos;ll email you a magic link.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardBody>
          {sent ? (
            <Callout tone="success" title="Check your inbox">
              We sent a magic link to <strong>{email}</strong>. Click it to continue.
            </Callout>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
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
                {loading ? "Sending..." : "Send magic link"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                No account yet?{" "}
                <Link href="/signup" className="font-medium text-sherpa-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          )}
        </CardBody>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginInner />
    </React.Suspense>
  );
}
