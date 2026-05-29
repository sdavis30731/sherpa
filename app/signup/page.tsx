"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { ShieldCheck, KeyRound, Bot } from "lucide-react";

export default function SignupPage() {
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
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
        <h1 className="text-3xl font-bold text-slate-900">Create your Sherpa account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Free for your first project. No credit card.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign up with email</CardTitle>
        </CardHeader>
        <CardBody>
          {sent ? (
            <Callout tone="success" title="Check your inbox">
              We sent a magic link to <strong>{email}</strong>. Click it to finish signing up.
              The link expires in an hour.
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
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-sherpa-600 hover:underline">
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
          text="Sherpa never sees your passphrase."
        />
        <Reassure
          icon={<KeyRound className="h-4 w-4" />}
          text="Your keys are encrypted in your browser before they leave it."
        />
        <Reassure
          icon={<Bot className="h-4 w-4" />}
          text="When Claude or Cursor uses a key, they never see it — Sherpa makes the API call for them."
        />
      </div>
    </main>
  );
}

function Reassure({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-600">
      <span className="mt-0.5 text-sherpa-500">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
