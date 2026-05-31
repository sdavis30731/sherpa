"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import {
  deriveKey,
  encrypt,
  generateSalt,
  toBase64,
  ARGON_PARAMS_PRODUCTION,
} from "@/lib/crypto";
import { generateRecoveryCode, recoveryWords } from "@/lib/recovery";
import { estimatePassphrase } from "@/lib/passphrase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Eye, EyeOff, Copy, Download, Check } from "lucide-react";

type Step = "passphrase" | "recovery" | "saving" | "done";

export default function SetupPage() {
  const router = useRouter();
  const vault = useVaultKey();

  const [step, setStep] = React.useState<Step>("passphrase");
  const [passphrase, setPassphrase] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [recoveryCode] = React.useState(() => generateRecoveryCode());
  const [ack, setAck] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const strength = estimatePassphrase(passphrase);
  const passOk = strength.score >= 3 && passphrase === confirm && passphrase.length > 0;

  function onContinueFromPassphrase(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passOk) {
      setError("Choose a stronger passphrase and make sure both fields match.");
      return;
    }
    setStep("recovery");
  }

  async function onFinish() {
    setError(null);
    setStep("saving");
    try {
      // 1. Derive the vault key from the passphrase.
      const argonSalt = generateSalt();
      const vaultKey = await deriveKey(passphrase, argonSalt, ARGON_PARAMS_PRODUCTION);

      // 2. Encrypt the sentinel string so we can verify the passphrase on unlock.
      const sentinel = await encrypt("sherpa-ok", vaultKey);

      // 3. Derive a recovery key and use it to wrap the passphrase itself.
      const recoverySalt = generateSalt();
      const recoveryKey = await deriveKey(
        recoveryCode,
        recoverySalt,
        ARGON_PARAMS_PRODUCTION,
      );
      const wrappedPassphrase = await encrypt(passphrase, recoveryKey);

      // 4. Save the public material (salts, params, ciphertexts) to Supabase.
      //    The passphrase and recovery code themselves are NEVER sent to the server.
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Upsert in case the public.users row wasn't auto-created by the
      // handle_new_user trigger (e.g., user signed up before migration 0001
      // had created the trigger). RLS allows insert + update where id = auth.uid().
      const { error: upErr } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            argon_salt: toBase64(argonSalt),
            argon_params: ARGON_PARAMS_PRODUCTION,
            sentinel_ciphertext: sentinel,
            recovery_wrapped_passphrase: wrappedPassphrase,
            recovery_salt: toBase64(recoverySalt),
            recovery_params: ARGON_PARAMS_PRODUCTION,
          },
          { onConflict: "id" },
        );
      if (upErr) throw upErr;

      // 5. Hold the derived key in the vault context for this session.
      vault.unlock(vaultKey);

      setStep("done");
      setTimeout(() => router.push("/vault"), 700);
    } catch (err) {
      // Log the raw error so Steve can see it in DevTools console too.
      console.error("Vault setup failed:", err);
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : typeof err === "string"
              ? err
              : "Could not save your setup. (Check browser console for details.)";
      setError(message);
      setStep("recovery");
    }
  }

  async function copyRecovery() {
    await navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadRecovery() {
    const blob = new Blob(
      [
        `Sherpa recovery code\n====================\n\n${recoveryCode}\n\n` +
          `These twelve words can recover your passphrase if you forget it.\n` +
          `Keep this file somewhere safe — a password manager, a printed copy,\n` +
          `or both. Anyone with these words AND access to your Sherpa account\n` +
          `can read your vault.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sherpa-recovery-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Set up your vault</h1>
        <p className="mt-1 text-sm text-slate-600">
          Step {step === "passphrase" ? "1" : "2"} of 2 ·{" "}
          {step === "passphrase" ? "Master passphrase" : "Recovery code"}
        </p>
      </div>

      {step === "passphrase" && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a master passphrase</CardTitle>
          </CardHeader>
          <CardBody>
            <Callout tone="warning" title="This is the one thing SherpaKeys cannot recover.">
              Your passphrase encrypts everything in your vault. We never see it.
              If you forget it, you can use the recovery code you&apos;ll get on the
              next screen. If you lose both, your vault is unreadable.
            </Callout>

            <form onSubmit={onContinueFromPassphrase} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pass">Passphrase</Label>
                <div className="relative">
                  <Input
                    id="pass"
                    type={reveal ? "text" : "password"}
                    autoComplete="new-password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="pr-10"
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
                <StrengthBar strength={strength} />
              </div>

              <div>
                <Label htmlFor="confirm">Confirm passphrase</Label>
                <Input
                  id="confirm"
                  type={reveal ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                {confirm.length > 0 && confirm !== passphrase && (
                  <p className="mt-1 text-xs text-red-600">Passphrases don&apos;t match.</p>
                )}
              </div>

              {error && <Callout tone="danger">{error}</Callout>}

              <Button type="submit" fullWidth disabled={!passOk}>
                Continue
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {(step === "recovery" || step === "saving" || step === "done") && (
        <Card>
          <CardHeader>
            <CardTitle>Save your recovery code</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Callout tone="danger" title="You will only see this once.">
              These twelve words can recover your passphrase if you forget it.
              Anyone with this code and access to your account can read your vault.
              Keep it somewhere safe.
            </Callout>

            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="grid grid-cols-3 gap-2 font-mono text-sm sm:grid-cols-4">
                {recoveryWords(recoveryCode).map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded bg-white px-2 py-1 shadow-sm"
                  >
                    <span className="text-xs text-slate-400">{i + 1}.</span>
                    <span className="font-semibold text-slate-800">{w}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copyRecovery}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="secondary" onClick={downloadRecovery}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sherpa-500"
              />
              <span>
                I have saved my recovery code in a safe place. I understand that if I
                lose it and forget my passphrase, my vault cannot be recovered.
              </span>
            </label>

            {error && <Callout tone="danger">{error}</Callout>}

            <Button
              fullWidth
              disabled={!ack || step === "saving" || step === "done"}
              onClick={onFinish}
            >
              {step === "saving"
                ? "Encrypting and saving..."
                : step === "done"
                  ? "Done — opening your vault"
                  : "Finish setup"}
            </Button>
          </CardBody>
        </Card>
      )}
    </main>
  );
}

function StrengthBar({ strength }: { strength: ReturnType<typeof estimatePassphrase> }) {
  const colors = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded ${i <= strength.score ? colors[strength.score] : "bg-slate-200"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">{strength.label}</span>
        <span className="text-slate-400">~{strength.entropyBits} bits</span>
      </div>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-slate-500">
          {strength.feedback.slice(0, 2).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
