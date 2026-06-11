"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { deriveKey, decrypt, fromBase64, type ArgonParams } from "@/lib/crypto";
import { generateAgencyKeypair } from "@/lib/keypair";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 60_000;

export default function UnlockPage() {
  const router = useRouter();
  const vault = useVaultKey();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/vault";

  const [passphrase, setPassphrase] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [attempts, setAttempts] = React.useState(0);
  const [cooldownUntil, setCooldownUntil] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(Date.now());

  // Tick to update cooldown countdown
  React.useEffect(() => {
    if (cooldownUntil === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const cooling = cooldownRemaining > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooling) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select(
          "argon_salt, argon_params, sentinel_ciphertext, public_key, wrapped_private_key",
        )
        .eq("id", user.id)
        .single();
      if (pErr) throw pErr;
      if (!profile?.argon_salt || !profile?.sentinel_ciphertext) {
        router.push("/vault/setup");
        return;
      }

      const salt = fromBase64(profile.argon_salt);
      const params = profile.argon_params as ArgonParams;
      const key = await deriveKey(passphrase, salt, params);

      // Verify by attempting to decrypt the sentinel.
      try {
        const sentinel = await decrypt(profile.sentinel_ciphertext, key);
        if (sentinel !== "sherpa-ok") throw new Error("sentinel mismatch");
      } catch {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setCooldownUntil(Date.now() + COOLDOWN_MS);
          setAttempts(0);
          setError(`Too many attempts. Try again in ${Math.ceil(COOLDOWN_MS / 1000)} seconds.`);
        } else {
          setError(`Incorrect passphrase. ${MAX_ATTEMPTS - next} attempt(s) left.`);
        }
        setPassphrase("");
        return;
      }

      // SHRP-107c — lazy-migrate users from before the asymmetric
      // keypair existed. Now that we have the vault key in hand, we
      // can wrap a fresh X25519 private key with it and save the
      // public + wrapped private side-by-side. ~200ms one-time cost
      // the first time an existing user unlocks after this ships.
      // Subsequent unlocks skip this entirely.
      if (!profile.public_key || !profile.wrapped_private_key) {
        try {
          const kp = await generateAgencyKeypair(key);
          await supabase
            .from("users")
            .update({
              public_key: kp.publicKey,
              wrapped_private_key: kp.wrappedPrivateKey,
              keypair_algo: kp.algo,
            } as never)
            .eq("id", user.id);
        } catch (kpErr) {
          // Don't block unlock on keypair generation — log and move
          // on. Worst case we retry next unlock.
          console.error("SHRP-107 keypair lazy-migration failed:", kpErr);
        }
      }

      vault.unlock(key);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-sherpa-500" />
            Unlock your vault
          </CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-slate-600">
            Enter your master passphrase. It never leaves this browser.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pass">Passphrase</Label>
              <div className="relative">
                <Input
                  id="pass"
                  type={reveal ? "text" : "password"}
                  autoComplete="current-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={cooling || loading}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={reveal ? "Hide passphrase" : "Show passphrase"}
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <Callout tone="danger">{error}</Callout>}

            <Button type="submit" fullWidth disabled={loading || cooling || !passphrase}>
              {loading
                ? "Unlocking..."
                : cooling
                  ? `Wait ${cooldownRemaining}s...`
                  : "Unlock"}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Forgot your passphrase? Use your{" "}
              <a className="font-medium text-sherpa-600 hover:underline" href="/vault/recover">
                recovery code
              </a>
              .
            </p>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
