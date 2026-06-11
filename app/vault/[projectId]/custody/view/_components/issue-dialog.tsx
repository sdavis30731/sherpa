"use client";

/**
 * SHRP-098 — IssueCustodyDialog.
 *
 * The moment of upgrade. Draft → issued. In v1 (Stripe paused) there's
 * no actual charge — the dialog tells the agency that issues are free
 * during the founding cohort and that the rate locks in at $79/record
 * once billing flips on. The confirm button POSTs to
 * /api/custody/[projectId]/issue.
 *
 * When Stripe metered billing is live, this dialog's confirm path will
 * redirect to Stripe Checkout first, and the issue route will be the
 * webhook handler instead. The view page contract (issued_at flips,
 * watermark disappears) stays identical, so the swap is contained.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FileCheck, Sparkles, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function IssueCustodyDialog({
  projectId,
  open,
  onOpenChange,
  clientName,
}: Props) {
  const router = useRouter();
  const [issuing, setIssuing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onIssue() {
    setIssuing(true);
    setError(null);
    try {
      const res = await fetch(`/api/custody/${projectId}/issue`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      onOpenChange(false);
      // Refresh so the view page re-renders without the watermark.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        clientName
          ? `Issue Custody Record for ${clientName}`
          : "Issue Custody Record"
      }
      description="Issuing makes this the official record. The DRAFT watermark goes away, and the issued date stamps onto the document."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-sherpa-200 bg-sherpa-50 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-semibold text-sherpa-900">
              Custody Record · per issue
            </div>
            <div className="text-2xl font-bold text-sherpa-700">
              $99
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-sherpa-900">
            <li className="flex items-start gap-2">
              <FileCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Official, dated, agency-signed record you can hand to the client
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              You keep any markup billed to the client
            </li>
          </ul>
        </div>

        <Callout tone="success" title="Founding cohort — free for now">
          Billing isn&apos;t live yet (we&apos;re finalizing the LLC + Terms
          of Service). Issuing now is free, and you lock in the $79
          founding-cohort rate forever once we light up Stripe.
        </Callout>

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={issuing}
          >
            Cancel
          </Button>
          <Button onClick={onIssue} disabled={issuing}>
            {issuing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileCheck className="h-4 w-4" />
            )}
            {issuing ? "Issuing..." : "Issue Custody Record"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
