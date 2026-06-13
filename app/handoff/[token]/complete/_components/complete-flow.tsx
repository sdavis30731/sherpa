"use client";

/**
 * SHRP-100f — Complete handoff client flow.
 *
 * The cryptographic ownership transfer happens here, in the agency's
 * browser. State machine:
 *
 *   loading       — fetching /rekey-info
 *   ready         — pre-transfer confirmation screen
 *   reencrypting  — looping through credentials, decrypt → seal
 *   transferring  — POST to /complete, server flips ownership
 *   done          — success screen
 *   error         — bail-out with details
 *
 * The vault key has to be in memory the whole time. If it's not,
 * redirect to /vault/unlock with next= pointing back here.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useVaultKey } from "@/lib/vault-context";
import { decrypt } from "@/lib/crypto";
import { sealForAgency } from "@/lib/keypair";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";

interface Props {
  token: string;
  projectId: string;
  clientEmail: string;
  clientName: string;
  initialStatus: string;
}

interface RekeyInfo {
  handoff: {
    id: string;
    project_id: string;
    client_email: string;
    client_name: string | null;
    opted_in_to_paid_vault: boolean;
  };
  client_public_key: string;
  credentials: Array<{
    id: string;
    service: string;
    env: string;
    label: string;
    ciphertext: string;
    ciphertext_format: string;
  }>;
  project: { name: string; client_name: string | null } | null;
}

type Stage = "loading" | "ready" | "reencrypting" | "transferring" | "done" | "error";

export function CompleteFlow({
  token,
  projectId,
  clientEmail,
  clientName,
  initialStatus,
}: Props) {
  const router = useRouter();
  const vault = useVaultKey();

  const [stage, setStage] = React.useState<Stage>("loading");
  const [info, setInfo] = React.useState<RekeyInfo | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [transferred, setTransferred] = React.useState(initialStatus === "transferred");
  const [subscriptionStarted, setSubscriptionStarted] = React.useState(false);

  // Vault gate.
  React.useEffect(() => {
    if (transferred) return;
    if (!vault.key) {
      router.push(
        `/vault/unlock?next=${encodeURIComponent(`/handoff/${token}/complete`)}`,
      );
    }
  }, [vault.key, router, token, transferred]);

  // Load rekey info.
  React.useEffect(() => {
    if (transferred) return;
    if (!vault.key) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/handoff/${token}/rekey-info`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `HTTP ${res.status}`,
          );
        }
        const data = (await res.json()) as RekeyInfo;
        if (cancelled) return;
        setInfo(data);
        setStage("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load handoff.");
        setStage("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, vault.key, transferred]);

  async function onConfirmTransfer() {
    if (!info || !vault.key) return;

    setError(null);
    setStage("reencrypting");
    setProgress({ done: 0, total: info.credentials.length });

    const reencrypted: Array<{ credential_id: string; new_ciphertext_b64: string }> = [];
    try {
      for (let i = 0; i < info.credentials.length; i++) {
        const c = info.credentials[i]!;
        if (c.ciphertext_format !== "vault_key") {
          // The credential is in sealed-box format already (mid-
          // rotation re-wrap pending). Skip — it'll get handled on
          // the agency's next unlock and then on the client's.
          // For v1 we just bail out and ask the agency to unlock first.
          throw new Error(
            `Credential "${c.label}" is in agency_sealed_box format (post-rotation re-wrap pending). Refresh /vault and re-open this page so the re-wrap completes first.`,
          );
        }
        let plaintext: string;
        try {
          plaintext = await decrypt(c.ciphertext, vault.key);
        } catch (err) {
          throw new Error(
            `Could not decrypt "${c.label}": ${err instanceof Error ? err.message : "decrypt failed"}`,
          );
        }
        const sealed = await sealForAgency(plaintext, info.client_public_key);
        // Wipe the plaintext from local scope as soon as we have the
        // sealed version.
        plaintext = "";
        reencrypted.push({
          credential_id: c.id,
          new_ciphertext_b64: sealed,
        });
        setProgress({ done: i + 1, total: info.credentials.length });
      }

      setStage("transferring");

      const res = await fetch(`/api/handoff/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: reencrypted }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          details?: string;
        };
        throw new Error(
          body.message ?? body.details ?? body.error ?? `HTTP ${res.status}`,
        );
      }
      const data = (await res.json()) as {
        ok: boolean;
        transferred_at: string;
        credentials_count: number;
        subscription_started: boolean;
      };
      setSubscriptionStarted(data.subscription_started);
      setTransferred(true);
      setStage("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
      setStage("error");
    }
  }

  // ─── Already transferred ───────────────────────────────────────
  if (transferred && stage !== "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Already transferred</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Callout tone="success" title="This engagement is owned by your client">
            <p className="text-xs">
              The transfer was completed previously. {clientName || clientEmail} now controls this vault.
            </p>
          </Callout>
          <div className="flex justify-end">
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
            >
              Back to engagements
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  // ─── Success ──────────────────────────────────────────────────
  if (stage === "done") {
    return (
      <Card>
        <CardBody className="space-y-4 py-10 text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Transfer complete.
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every credential in this engagement is now encrypted for{" "}
            <strong>{clientName || clientEmail}</strong>. They&apos;ll see the
            engagement in their vault on next sign-in.{" "}
            {subscriptionStarted && (
              <>
                Their founding-cohort $7/month vault subscription is active —
                lock in for the lifetime of their engagement.
              </>
            )}
          </p>
          <p className="text-xs text-slate-500">
            You&apos;re no longer the owner. The original ownership is logged
            on the engagement&apos;s audit history.
          </p>
          <div className="flex justify-center pt-2">
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
            >
              Back to dashboard
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  // ─── Error ────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <Card className="border-red-200">
        <CardHeader className="border-red-100">
          <CardTitle className="text-red-700">Transfer failed</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Callout tone="danger">
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          </Callout>
          <p className="text-xs text-slate-500">
            Your client&apos;s vault is untouched. The engagement is still
            yours; we can retry from the Settings page.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/vault/${projectId}/settings`)}
            >
              Back to settings
            </Button>
            <Button
              onClick={() => {
                setError(null);
                setStage("loading");
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <Card>
        <CardBody className="flex items-center gap-3 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {!vault.key
            ? "Vault is locked. Redirecting to unlock…"
            : "Loading handoff details…"}
        </CardBody>
      </Card>
    );
  }

  // ─── Ready (confirm) + Re-encrypting + Transferring ───────────
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete handoff to {clientName || clientEmail}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Callout tone="info" title="What's about to happen, step by step">
            <ol className="list-decimal pl-5 text-xs leading-relaxed">
              <li>
                Your browser decrypts each of the {info?.credentials.length}{" "}
                credentials in this engagement using your vault key.
              </li>
              <li>
                Your browser re-encrypts each one using{" "}
                {clientName || "the client"}&apos;s public key. SherpaKeys
                can&apos;t read either format.
              </li>
              <li>
                We send the re-encrypted bundle to our server, which atomically
                flips ownership of the engagement, every credential, and any
                auto-rotation policies you set up.
              </li>
              <li>
                You&apos;re no longer the owner. The client&apos;s next vault
                unlock silently re-wraps everything to their vault key —
                they don&apos;t see this step.
              </li>
            </ol>
          </Callout>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start gap-2 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Zero-knowledge through and through:</strong> the
                credentials exist in plaintext only inside this browser, for
                milliseconds per credential. Our server only ever sees
                ciphertext.
              </div>
            </div>
          </div>

          {info?.handoff.opted_in_to_paid_vault && (
            <Callout tone="success" title="Founding-cohort subscription">
              <p className="text-xs">
                The client opted in to the $9/month auto-rotating vault — at
                handoff they lock the founding-cohort rate of <strong>$7/month</strong>{" "}
                forever. Billing starts when Stripe lights up; until then,
                they&apos;re on grace.
              </p>
            </Callout>
          )}

          {stage === "reencrypting" && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Re-encrypting {progress.done} of {progress.total}…
                </span>
                <span>
                  {Math.round((progress.done / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.round((progress.done / progress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {stage === "transferring" && (
            <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Flipping ownership server-side…
            </div>
          )}

          {error && <Callout tone="danger">{error}</Callout>}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href={`/vault/${projectId}/settings`}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel and go back
            </Link>
            <Button
              onClick={onConfirmTransfer}
              disabled={
                stage === "reencrypting" ||
                stage === "transferring" ||
                !info ||
                !vault.key
              }
            >
              {stage === "reencrypting" || stage === "transferring" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {stage === "reencrypting"
                ? "Re-encrypting..."
                : stage === "transferring"
                  ? "Transferring..."
                  : `Transfer ${info?.credentials.length ?? 0} credentials to ${clientName || clientEmail}`}
              {stage === "ready" && <ArrowRight className="h-3 w-3 opacity-70" />}
            </Button>
          </div>
          <p className="text-center text-[11px] text-slate-500">
            <Sparkles className="-mt-0.5 mr-0.5 inline h-3 w-3" />
            This is irreversible — the client becomes the owner the moment
            this completes. Make sure the engagement is fully done.
          </p>
          {!vault.key && (
            <p className="flex items-center justify-center gap-1 text-[11px] text-amber-700">
              <Lock className="h-3 w-3" />
              Vault must be unlocked. Redirecting…
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
