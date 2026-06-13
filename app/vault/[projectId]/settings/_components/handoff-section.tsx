"use client";

/**
 * SHRP-100 — Hand off section on engagement settings.
 *
 * Four visual states:
 *   - alreadyTransferred → quiet "Ownership transferred" callout
 *   - inFlight (pending_acceptance) → "Waiting on {email} to claim"
 *   - inFlight (pending_rekey) → "Client ready — complete the transfer"
 *   - isReady → "Hand off" CTA opens the HandoffDialog
 *   - !isReady → muted "Mark launched + issue Custody Record first" notice
 */

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { HandoffDialog } from "@/components/handoff-dialog";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  projectId: string;
  engagementName: string;
  clientName: string;
  isReady: boolean;
  alreadyTransferred: boolean;
  inFlight: {
    id: string;
    status: string;
    client_email: string;
    started_at: string;
    accepted_at: string | null;
  } | null;
}

export function HandoffSection({
  projectId,
  engagementName,
  clientName,
  isReady,
  alreadyTransferred,
  inFlight,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [revoking, setRevoking] = React.useState(false);

  async function onRevoke() {
    setRevoking(true);
    try {
      await fetch(`/api/engagements/${projectId}/handoff`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hand off to client</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {alreadyTransferred ? (
            <Callout tone="success" title="Ownership transferred">
              <p className="text-xs">
                This engagement is now owned by your client. The credentials
                and Custody Record are theirs to manage.
              </p>
            </Callout>
          ) : inFlight ? (
            inFlight.status === "pending_acceptance" ? (
              <>
                <Callout
                  tone="info"
                  title={`Waiting on ${inFlight.client_email}`}
                >
                  <div className="flex items-start gap-2 text-xs">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      We sent a claim link on{" "}
                      {new Date(inFlight.started_at).toLocaleDateString()}.
                      When they sign up and set their passphrase, you&apos;ll
                      see a &quot;ready to transfer&quot; banner here.
                    </span>
                  </div>
                </Callout>
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={onRevoke}
                    disabled={revoking}
                  >
                    {revoking ? "Revoking..." : "Revoke handoff"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Callout
                  tone="success"
                  title={`${inFlight.client_email} is ready`}
                >
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      They&apos;ve created their account and set up their
                      vault. Click below to complete the transfer in your
                      browser — you&apos;ll unlock your vault one more time,
                      we&apos;ll re-encrypt every credential for them, then
                      ownership flips.
                    </span>
                  </div>
                </Callout>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={onRevoke}
                    disabled={revoking}
                  >
                    Revoke
                  </Button>
                  <Button
                    onClick={() => {
                      // Day 5-6: this opens the rekey flow. For now, point
                      // at the rekey route placeholder.
                      window.location.href = `/handoff/${inFlight.id}/complete`;
                    }}
                  >
                    Complete transfer
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )
          ) : isReady ? (
            <>
              <p className="text-sm text-slate-700">
                <strong>{engagementName}</strong> is launched and the Custody
                Record is issued. Now you can hand it off — transfer ownership
                of every credential to{" "}
                {clientName ? <strong>{clientName}</strong> : "your client"}{" "}
                in a few clicks, with the option to enroll them in the
                $9/month auto-rotating vault for ongoing peace of mind.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setDialogOpen(true)}>
                  <Send className="h-4 w-4" />
                  Hand off engagement
                  <ArrowRight className="h-3 w-3 opacity-70" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                Mark this engagement as <strong>Launched</strong> and issue
                the <strong>Custody Record</strong> before you can hand it
                off. Clients shouldn&apos;t inherit work-in-progress.
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      <HandoffDialog
        projectId={projectId}
        engagementName={engagementName}
        defaultClientName={clientName}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
