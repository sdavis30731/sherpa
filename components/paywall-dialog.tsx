"use client";

import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Infinity as InfinityIcon, Clock } from "lucide-react";

/**
 * Paywall dialog — opens when a free-tier user hits the 1-project limit.
 *
 * Status (SHRP-054): Stripe Lifetime checkout is temporarily paused while
 * SherpaKeys' legal entity (LLC) is being formed via Stripe Atlas. We don't
 * want $19 payments flowing into EcoVerse's bank account in the meantime.
 * The dialog now points users to the launch waitlist instead of starting a
 * Stripe Checkout session.
 *
 * To re-enable: revert this file to the previous SHRP-045 version.
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
      description="The free tier allows one project. Lifetime is coming with v1.1 — join the launch waitlist below and we'll let you know the moment it goes live."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-sherpa-200 bg-sherpa-50 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-semibold text-sherpa-900">
              SherpaKeys Lifetime
            </div>
            <div className="text-2xl font-bold text-sherpa-700">
              $19
              <span className="text-sm font-medium text-sherpa-600">
                {" "}
                one-time
              </span>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-sherpa-900">
            <li className="flex items-start gap-2">
              <InfinityIcon className="mt-0.5 h-4 w-4 shrink-0" /> Unlimited
              projects, unlimited MCP agent tokens
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> 5,000 MCP agent
              calls / month, 90-day audit log retention
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> Priority email
              support
            </li>
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Coming with v1.1.</strong> We&apos;re finalizing setup
            before opening Lifetime purchases. Join the early-access list to
            be among the first told when it&apos;s live.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link
            href="/pro-waitlist?tier=lifetime"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sherpa-600"
          >
            Join the early-access list
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
