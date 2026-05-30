"use client";

/**
 * Vault recovery — SHRP-005a (discovered while Steve was using the product).
 *
 * Flow:
 *   1. User pastes or types their 12-word BIP-39 recovery code.
 *   2. Browser derives the recovery key (Argon2id over the code + the
 *      stored recovery_salt and recovery_params).
 *   3. Browser decrypts the stored recovery_wrapped_passphrase to recover
 *      the original passphrase.
 *   4. Browser derives the vault key from that passphrase + argon_salt, and
 *      verifies it by decrypting the sentinel. Belt-and-suspenders sanity
 *      check that everything lines up.
 *   5. Page displays the recovered passphrase to the user with a Copy
 *      button and a strong nudge to save it in a password manager. Vault
 *      is auto-unlocked for the session.
 *
 * The 12 words and the recovered passphrase NEVER leave the browser.
 * Server only ever sees ciphertext + salts + Argon2id params.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import {
  deriveKey,
  decrypt,
  fromBase64,
  type ArgonParams,
} from "@/lib/crypto";
import { normalizeRecoveryInput } from "@/lib/recovery";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Eye, EyeOff, Copy, Check, ShieldCheck, ArrowRight } from "lucide-react";

type Step = "input" | "working" | "done";

interface Profile {
  argon_salt: string;
  argon_params: ArgonParams;
  sentinel_ciphertext: string;
  recovery_wrapped_passphrase: string;
  recovery_salt: string;
  recovery_params: ArgonParams;
}

export default function RecoverPage() {
  const router = useRouter();
  const vault = useVaultKey();

  const [step, setStep] = React.useState<Step>("input");
  const [input, setInput] = React.useState("");
  const [recovered, setRecovered] = React.useState<string | null>(null);
  const [showPass, setShowPass] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const normalized = normalizeRecoveryInput(input);
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;

  async function onRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (wordCount !== 12) {
      setError(
        `Recovery codes are 12 words. You entered ${wordCount}. Check for typos or missing words.`,
      );
      return;
    }

    setStep("working");
    try {
      // Fetch the stored material for this user.
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?next=/vault/recover");
        return;
      }

      const { data: profile, error: pErr } = await supabase
        .from("users")
        .select(
          "argon_salt, argon_params, sentinel_ciphertext, recovery_wrapped_passphrase, recovery_salt, recovery_params",
        )
        .eq("id", user.id)
        .single();
      if (pErr) throw pErr;

      const p = profile as Partial<Profile>;
      if (
        !p?.recovery_salt ||
        !p?.recovery_params ||
        !p?.recovery_wrapped_passphrase ||
        !p?.argon_salt ||
        !p?.argon_params ||
        !p?.sentinel_ciphertext
      ) {
        throw new Error(
          "This account doesn't have a recovery code on file. You may need to set up your vault first.",
        );
      }

      // 1. Derive the recovery key from the 12 words.
      const recoverySalt = fromBase64(p.recovery_salt);
      const recoveryKey = await deriveKey(
        normalized,
        recoverySalt,
        p.recovery_params,
      );

      // 2. Unwrap the passphrase.
      let passphrase: string;
      try {
        passphrase = await decrypt(p.recovery_wrapped_passphrase, recoveryKey);
      } catch {
        throw new Error(
          "Those 12 words didn't decrypt your recovery data. Check for typos. Words are case-insensitive but order matters.",
        );
      }

      // 3. Belt-and-suspenders: derive the vault key from the recovered
      //    passphrase and verify against the sentinel.
      const vaultSalt = fromBase64(p.argon_salt);
      const vaultKey = await deriveKey(passphrase, vaultSalt, p.argon_params);
      try {
        const sentinel = await decrypt(p.sentinel_ciphertext, vaultKey);
        if (sentinel !== "sherpa-ok") {
          throw new Error("sentinel mismatch");
        }
      } catch {
        throw new Error(
          "Recovery succeeded but the resulting passphrase didn't unlock your vault. Please contact support.",
        );
      }

      // 4. Done — unlock the vault for the session and display the passphrase.
      vault.unlock(vaultKey);
      setRecovered(passphrase);
      setStep("done");
    } catch (err) {
      console.error("Recovery failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Recovery failed. Check the words and try again.",
      );
      setStep("input");
    }
  }

  async function copyPassphrase() {
    if (!recovered) return;
    await navigator.clipboard.writeText(recovered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Recover your passphrase</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the 12-word recovery code you saved when you set up your vault.
        </p>
      </div>

      {step !== "done" && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery code</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={onRecover} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="tiger middle utility hazard tooth sight beef submit achieve alone electric depth"
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
                  spellCheck={false}
                  autoFocus
                  autoCapitalize="off"
                  autoCorrect="off"
                  disabled={step === "working"}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Spaces or line breaks between words. Capitalization doesn&apos;t matter.
                  {wordCount > 0 && (
                    <>
                      {" "}
                      <span
                        className={
                          wordCount === 12 ? "text-emerald-700" : "text-amber-700"
                        }
                      >
                        {wordCount} of 12 words entered
                      </span>
                      .
                    </>
                  )}
                </p>
              </div>

              {error && <Callout tone="danger">{error}</Callout>}

              <Button
                type="submit"
                fullWidth
                disabled={step === "working" || wordCount !== 12}
              >
                {step === "working"
                  ? "Recovering... (this takes a few seconds)"
                  : "Recover passphrase"}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Remember your passphrase after all?{" "}
                <a
                  href="/vault/unlock"
                  className="font-medium text-sherpa-600 hover:underline"
                >
                  Unlock with passphrase
                </a>{" "}
                instead.
              </p>
            </form>
          </CardBody>
        </Card>
      )}

      {step === "done" && recovered && (
        <div className="space-y-4">
          <Callout tone="success" title="Recovered.">
            Your vault is unlocked for this session. Below is your master
            passphrase — the one you originally typed at setup. Save it
            somewhere you&apos;ll find it next time.
          </Callout>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sherpa-500" />
                Your passphrase
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <code className="break-all font-mono text-base text-slate-900">
                    {showPass ? recovered : "•".repeat(Math.min(recovered.length, 32))}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label={showPass ? "Hide" : "Show"}
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={copyPassphrase} fullWidth>
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy to clipboard"}
                </Button>
              </div>

              <Callout tone="warning" title="Save this in a password manager.">
                Your everyday way to unlock Sherpa is this passphrase — not
                the 12 words. The 12 words are only for emergencies. Paste
                this into 1Password, Apple Passwords, Bitwarden, or any
                place you trust to keep it for next time.
              </Callout>

              <Button onClick={() => router.push("/vault")} fullWidth>
                Open my vault <ArrowRight className="h-4 w-4" />
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </main>
  );
}

