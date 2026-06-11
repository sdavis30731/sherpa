"use client";

/**
 * SHRP-107d — Request Credentials dialog.
 *
 * Opens from a button on the engagement detail page. The agency picks
 * which services they need access to (from the launch-12), confirms
 * the client's email, and adds an optional personal note. On submit,
 * we POST /api/credential-requests which generates a signed token,
 * stores the row, and (once SHRP-107e ships) emails the client.
 *
 * In v1 the email send happens via the cron-style trigger in the API
 * route. The agency can also copy the share URL directly from the
 * success card and send it manually if they prefer.
 */

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { SERVICES } from "@/lib/services";
import {
  Mail,
  Send,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultClientName: string;
  defaultClientEmail?: string;
}

type Result = {
  id: string;
  token: string;
  share_url: string;
  expires_at: string;
};

export function RequestCredentialsDialog({
  open,
  onOpenChange,
  projectId,
  defaultClientName,
  defaultClientEmail,
}: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [clientEmail, setClientEmail] = React.useState(
    defaultClientEmail ?? "",
  );
  const [clientName, setClientName] = React.useState(defaultClientName);
  const [clientMessage, setClientMessage] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Reset everything when the dialog reopens.
  React.useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setClientEmail(defaultClientEmail ?? "");
      setClientName(defaultClientName);
      setClientMessage("");
      setError(null);
      setResult(null);
      setCopied(false);
      setSubmitting(false);
    }
  }, [open, defaultClientEmail, defaultClientName]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientEmail.trim() || !/.+@.+\..+/.test(clientEmail)) {
      setError("Enter a valid client email.");
      return;
    }
    if (selected.size === 0) {
      setError("Pick at least one service to request.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/credential-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          client_email: clientEmail.trim(),
          client_name: clientName.trim() || undefined,
          client_message: clientMessage.trim() || undefined,
          requested_services: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(body.details ?? body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Result;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request.");
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
      // ignore — manual copy still available
    }
  }

  // ─── Result state — request created ──────────────────────────
  if (result) {
    const expiresIn = Math.max(
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
        title="Request sent"
        description="Your client will receive an email with a secure link. The credentials they paste will be encrypted in their browser before they ever leave their machine."
      >
        <div className="space-y-4">
          <Callout tone="success" title="Sent">
            <p>
              <strong>{clientEmail}</strong> has been emailed a SherpaKeys
              link for{" "}
              <strong>
                {selected.size} service{selected.size === 1 ? "" : "s"}
              </strong>
              . Link expires in {expiresIn} day{expiresIn === 1 ? "" : "s"}.
            </p>
          </Callout>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Share link (copy if you&apos;d rather send it yourself)
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                {result.share_url}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  // ─── Form state ──────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request credentials from your client"
      description="Pick the services you need access to, and we'll send your client a secure link with step-by-step guides for each."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <section>
          <Label>
            Services you need <span className="text-red-500">*</span>
          </Label>
          <p className="mb-2 text-xs text-slate-500">
            The client sees one guided card per selected service.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SERVICES.filter((s) => s.id !== "custom").map((svc) => {
              const checked = selected.has(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggle(svc.id)}
                  className={
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition " +
                    (checked
                      ? "border-sherpa-400 bg-sherpa-50 ring-1 ring-sherpa-300"
                      : "border-slate-200 bg-white hover:border-slate-300")
                  }
                >
                  <span
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: svc.color }}
                  >
                    {svc.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {svc.name}
                  </span>
                  {checked && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-sherpa-600" />
                  )}
                </button>
              );
            })}
          </div>
          {selected.size > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {selected.size} selected
            </p>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4">
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
            <Label htmlFor="client-message">
              Personal note{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <textarea
              id="client-message"
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Hi Olivia — could you set these up by end of week so we can start integrating? Each one has a step-by-step guide."
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Appears at the top of the client&apos;s page. Signed by your
              agency.
            </p>
          </div>
        </section>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2 text-xs text-emerald-900">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Your client&apos;s credentials are encrypted in their
              browser</strong>{" "}
              before they reach us. We can&apos;t read them. Only your vault
              key (your passphrase) can decrypt what they send.
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
          <Button
            type="submit"
            disabled={submitting || selected.size === 0 || !clientEmail}
          >
            {submitting ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send request
                <ChevronRight className="h-3 w-3 opacity-70" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
