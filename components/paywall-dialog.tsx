"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Sparkles, Infinity as InfinityIcon } from "lucide-react";

/**
 * Placeholder paywall — SHRP-008 stub.
 * The real Stripe Checkout integration is SHRP-037/038. For now we show what
 * the user would get for $19 and a "join the waitlist" CTA.
 */
export function PaywallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="You're out of free projects"
      description="The free tier allows one project. Upgrade for unlimited."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-sherpa-200 bg-sherpa-50 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-semibold text-sherpa-900">Sherpa Lifetime</div>
            <div className="text-2xl font-bold text-sherpa-700">
              $19<span className="text-sm font-medium text-sherpa-600"> one-time</span>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-sherpa-900">
            <li className="flex items-start gap-2">
              <InfinityIcon className="mt-0.5 h-4 w-4 shrink-0" /> Unlimited projects, forever
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> All future features included — no subscription
            </li>
          </ul>
        </div>

        <Callout tone="info">
          Stripe Checkout isn&apos;t wired up yet (SHRP-037). When it is, this
          button will open a one-time $19 payment.
        </Callout>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled>Upgrade to Lifetime</Button>
        </div>
      </div>
    </Dialog>
  );
}
