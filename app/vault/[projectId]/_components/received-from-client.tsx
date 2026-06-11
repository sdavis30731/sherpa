"use client";

/**
 * SHRP-107h — Received-from-client banner + accept flow.
 *
 * Renders on the engagement detail page when there are credential
 * submissions waiting for the agency to accept. Click "Accept" to:
 *
 *   1. Unwrap the agency's X25519 private key with the vault key
 *      (the vault must be unlocked — we redirect if not).
 *   2. For each pending submission:
 *        a. Decrypt the sealed-box ciphertext with the private key
 *           → plaintext credential.
 *        b. Re-encrypt with the vault key (same shape as
 *           Add Credential dialog).
 *        c. INSERT a credentials row.
 *        d. UPDATE credential_submissions to mark accepted_at +
 *           accepted_credential_id.
 *   3. Refresh the page.
 *
 * The plaintext exists for ~milliseconds inside this function. It
 * is never stored, never re-emitted, never written to disk.
 *
 * Realtime: subscribes to credential_submissions inserts and
 * router.refresh()-es so the count updates live as the client
 * pastes each credential.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { encrypt } from "@/lib/crypto";
import {
  unwrapAgencyPrivateKey,
  openFromAgency,
} from "@/lib/keypair";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Callout } from "@/components/ui/callout";
import {
  Inbox,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Props {
  projectId: string;
  initialPendingCount: number;
}

type SubmissionRow = {
  id: string;
  request_id: string;
  service: string;
  key_type: string | null;
  label: string | null;
  env: "dev" | "staging" | "production";
  ciphertext_b64: string;
  submitted_at: string;
};

export function ReceivedFromClient({
  projectId,
  initialPendingCount,
}: Props) {
  const router = useRouter();
  const vault = useVaultKey();
  const [count, setCount] = React.useState(initialPendingCount);
  const [open, setOpen] = React.useState(false);
  const [accepting, setAccepting] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    done: number;
    total: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // ─── Realtime — light up live when the client submits ─────────
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`engagement_submissions:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credential_submissions",
        },
        () => {
          // RLS scopes the channel to rows the agency owns, so any
          // insert we receive belongs to one of our requests.
          // The count is per-project so we re-fetch from the server.
          router.refresh();
          // Optimistic bump until refresh lands.
          setCount((c) => c + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  React.useEffect(() => {
    setCount(initialPendingCount);
  }, [initialPendingCount]);

  if (count === 0) return null;

  async function onAccept() {
    setError(null);
    setProgress(null);
    if (!vault.key) {
      router.push(`/vault/unlock?next=/vault/${projectId}`);
      return;
    }
    setAccepting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      // Pull our wrapped private key + the pending submissions.
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("wrapped_private_key")
        .eq("id", user.id)
        .single();
      if (userErr) throw userErr;
      const wrappedPriv = (
        userRow as { wrapped_private_key: string | null }
      ).wrapped_private_key;
      if (!wrappedPriv) {
        throw new Error(
          "No agency keypair on file. Unlock your vault once to generate one, then try again.",
        );
      }

      // Get the pending submissions for this project. RLS allows
      // reading via the credential_requests join.
      const { data: requestsRaw, error: reqErr } = await supabase
        .from("credential_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", projectId);
      if (reqErr) throw reqErr;
      const requestIds = (requestsRaw ?? []).map(
        (r) => (r as { id: string }).id,
      );
      if (requestIds.length === 0) {
        throw new Error("No requests found for this engagement.");
      }

      const { data: subsRaw, error: subsErr } = await supabase
        .from("credential_submissions")
        .select(
          "id, request_id, service, key_type, label, env, ciphertext_b64, submitted_at",
        )
        .in("request_id", requestIds)
        .is("accepted_at", null)
        .is("declined_at", null)
        .order("submitted_at", { ascending: true });
      if (subsErr) throw subsErr;
      const subs = (subsRaw ?? []) as SubmissionRow[];

      if (subs.length === 0) {
        setCount(0);
        setOpen(false);
        router.refresh();
        return;
      }

      setProgress({ done: 0, total: subs.length });

      // Unwrap the private key once.
      const privateKey = await unwrapAgencyPrivateKey(wrappedPriv, vault.key);

      // Walk through each submission.
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i]!;
        // 1. Decrypt with our private key.
        let plaintext: string;
        try {
          plaintext = await openFromAgency(sub.ciphertext_b64, privateKey);
        } catch (err) {
          throw new Error(
            `Could not decrypt submission ${i + 1}/${subs.length} (service: ${sub.service}). ${err instanceof Error ? err.message : ""}`,
          );
        }

        // 2. Re-encrypt with the vault key, exactly like
        //    AddCredentialDialog does.
        const vaultCiphertext = await encrypt(plaintext, vault.key);
        // Clear our hold on plaintext as soon as we can.
        plaintext = "";

        // 3. Insert as a normal credentials row.
        const labelBase = sub.label?.trim() || `${sub.service} (from client)`;
        const { data: credInsert, error: credErr } = await supabase
          .from("credentials")
          .insert({
            project_id: projectId,
            user_id: user.id,
            service: sub.service,
            env: sub.env,
            label: labelBase,
            ciphertext: vaultCiphertext,
            last_rotated_at: new Date().toISOString(),
          } as never)
          .select("id")
          .single();
        if (credErr) throw credErr;
        const credentialId = (credInsert as { id: string }).id;

        // 4. Mark the submission accepted.
        await supabase
          .from("credential_submissions")
          .update({
            accepted_at: new Date().toISOString(),
            accepted_credential_id: credentialId,
          } as never)
          .eq("id", sub.id);

        // 5. Audit log per-credential — consistent with manual adds.
        await supabase.from("audit_log").insert({
          user_id: user.id,
          project_id: projectId,
          action: "credential_added",
          actor: "user",
          metadata: {
            service: sub.service,
            env: sub.env,
            via: "client_onboard",
            submission_id: sub.id,
          },
        });

        setProgress({ done: i + 1, total: subs.length });
      }

      setCount(0);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not accept submissions.",
      );
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-white">
            <Inbox className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              {count} credential{count === 1 ? "" : "s"} received from your client
            </div>
            <div className="text-xs text-slate-700">
              Encrypted with your public key. Click Accept to unwrap them
              into your vault.
            </div>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}>
          <CheckCircle2 className="h-4 w-4" />
          Accept
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!accepting) setOpen(o);
        }}
        title="Accept client credentials into your vault"
        description="We'll unwrap each one with your private key, re-encrypt with your vault key, and store them as normal credentials in this engagement."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start gap-2 text-xs text-emerald-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>What this does:</strong> for ~milliseconds per
                credential, the plaintext exists in your browser memory while
                we re-encrypt it for your vault. Nothing reaches the server in
                plaintext. The original sealed ciphertext is marked accepted
                but kept for audit.
              </div>
            </div>
          </div>

          {!vault.key && (
            <Callout tone="warning" title="Vault is locked.">
              We need your vault key to unwrap your private key. Click
              Accept and we&apos;ll send you through unlock first.
            </Callout>
          )}

          {progress && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Accepting {progress.done} of {progress.total}…
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

          {error && (
            <Callout tone="danger">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </Callout>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={accepting}
            >
              Cancel
            </Button>
            <Button onClick={onAccept} disabled={accepting}>
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {accepting ? "Accepting..." : `Accept ${count}`}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
