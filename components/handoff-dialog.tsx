"use client";

/**
 * SHRP-100c — Hand off engagement dialog.
 *
 * Surfaces on the engagement settings page when status='launched' and
 * the Custody Record has been issued. Agency picks the client's email,
 * decides whether to offer the $9/month paid vault, optionally writes
 * a personal note. Submit POSTs /api/engagements/[id]/handoff.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import {
  Send,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  engagementName: string;
  defaultClientName?: string;
}

type Result = {
  id: string;
  token: string;
  share_url: string;
  expires_at: string;
  email_sent: boolean;
};

export function HandoffDialog({
  open,
  onOpenChange,
  projectId,
  engagementName,
  defaultClientName,
}: Props) {
  const router = useRouter();
  const [clientEmail, setClientEmail] = React.useState("");
  const [clientName, setClientName] = React.useState(defaultClientName ?? "");
  const [agencyMessage, setAgencyMessage] = React.useState("");
  const [optedInToPaidVault, setOptedInToPaidVault] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setClientEmail("");
      setClientName(defaultClientName ?? "");
      setAgencyMessage("");
      setOptedInToPaidVault(true);
      setSubmitting(false);
      setError(null);
      setResult(null);
      setCopied(false);
    }
  }, [open, defaultClientName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientEmail.trim() || !/.+@.+\..+/.test(clientEmail)) {
      setError("Enter a valid client email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/engagements/${projectId}/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_email: clientEmail.trim(),
          client_name: clientName.trim() || undefined,
          agency_message: agencyMessage.trim() || undefined,
          opted_in_to_paid_vault: optedInToPaidVault,
        }),
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
      const data = (await res.json()) as Result;
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send handoff.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  if (result) {
    const daysLeft = Math.max(
      0,
      Math.round(
        (new Date(result.expires_at).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Handoff initiated"
        description="Your client will receive a branded email with their secure claim link. You'll be notified the moment they accept — that's when you finalize the transfer."
      >
        <div className="space-y-4">
          <Callout tone="success" title="Sent">
            <p>
              <strong>{clientEmail}</strong> has been emailed a SherpaKeys
              claim link for <strong>{engagementName}</strong>. Link expires
              in {daysLeft} day{daysLeft === 1 ? "" : "s"}.
              {!result.email_sent &&
                " (Email delivery failed — copy the link below and send it manually.)"}
            </p>
          </Callout>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Claim link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                {result.share_url}
              </code>
              <Button type="button" variant="secondary" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <Callout tone="info" title="Next: client signs up + sets their vault">
            <p className="text-xs leading-relaxed">
              They&apos;ll land on the agency-branded page, create their
              SherpaKeys account, set a passphrase, and generate their
              encryption keys. The moment they finish, your engagement
              dashboard will show a &quot;ready to transfer&quot; banner —
              click it to do the final browser-side re-encryption.
            </p>
          </Callout>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
      }}
      title={`Hand off ${engagementName}`}
      description="Transfer ownership of this engagement's vault to your client. They get all the credentials, the Custody Record, and a path to keep everything rotating after you walk away."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="client-email">
            Client email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="client-email"
            type="email"
            autoComplete="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="ops@brushfirecoffee.com"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Should be a long-lived email at the client&apos;s company. They
            sign up with this address.
          </p>
        </div>
        <div>
          <Label htmlFor="client-name">
            Client name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <Input
            id="client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Olivia Pham"
          />
        </div>
        <div>
          <Label htmlFor="agency-message">
            Personal note{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <textarea
            id="agency-message"
            value={agencyMessage}
            onChange={(e) => setAgencyMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Hi Olivia — your shop is live. Click below to take ownership of every credential we used to build it. Holler with any questions."
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Appears at the top of their claim page, signed by your agency.
          </p>
        </div>

        <div className="rounded-lg border border-sherpa-200 bg-sherpa-50 p-3">
          <label className="flex items-start gap-2 text-xs text-sherpa-900">
            <input
              type="checkbox"
              checked={optedInToPaidVault}
              onChange={(e) => setOptedInToPaidVault(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-sherpa-400 text-sherpa-500"
            />
            <span>
              <strong>Offer the $9/month auto-rotating vault.</strong>{" "}
              Recommended — the client never has to think about credential
              hygiene again, and any auto-rotation policies you set up move
              with the vault. They can decline and use the free vault instead.
              Billing is paused while we finalize Stripe — the first ten
              clients lock $7/month forever.
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2 text-xs text-emerald-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Zero-knowledge ownership transfer:</strong> after your
              client creates their passphrase, you&apos;ll re-encrypt every
              credential in your browser. SherpaKeys never sees plaintext.
              The client&apos;s vault key is the only key that can read them
              afterward.
            </div>
          </div>
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !clientEmail}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Sending..." : "Send handoff invite"}
            {!submitting && <ArrowRight className="h-3 w-3 opacity-70" />}
          </Button>
        </div>
        <p className="text-center text-[11px] text-slate-500">
          <Sparkles className="-mt-0.5 mr-0.5 inline h-3 w-3" />
          Bonus: once Stripe lights up, any rotation policies you set up
          generate $9/month in recurring revenue that you can take a cut of.
        </p>
      </form>
    </Dialog>
  );
}
