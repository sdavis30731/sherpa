"use client";

/**
 * Paywall dialog — opens when a free-tier user hits the 2-engagement limit.
 *
 * SHRP-095 + SHRP-096 — pricing model. Free includes 2 engagements;
 * additional engagements are $19/month each. Custody Records are $99
 * per engagement and billed separately at issue. This dialog only
 * covers the engagement upsell — the per-Custody-Record charge runs
 * its own flow at issue time.
 *
 * SHRP-054 status — Stripe metered billing for the per-engagement
 * subscription isn't wired in production yet (the LLC + ToS aren't
 * live). Until they are, we point the user at the founding cohort
 * list so we capture intent without taking a payment we can't legally
 * process.
 *
 * To re-enable Stripe checkout: replace the "Talk to us" link below
 * with a button that POSTs to /api/billing/create-engagement-sub.
 */

import * as React from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, FileCheck, Clock } from "lucide-react";

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
      title="You've reached the 2-engagement free tier"
      description="Free includes 2 active engagements. Additional engagements are $19/month each — and you can archive one anytime to free up a slot."
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-sherpa-200 bg-sherpa-50 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-base font-semibold text-sherpa-900">
              Additional engagements
            </div>
            <div className="text-2xl font-bold text-sherpa-700">
              $19
              <span className="text-sm font-medium text-sherpa-600">
                {" "}
                / engagement / month
              </span>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-sherpa-900">
            <li className="flex items-start gap-2">
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0" /> Unlimited
              credentials and MCP agent tokens inside the engagement
            </li>
            <li className="flex items-start gap-2">
              <FileCheck className="mt-0.5 h-4 w-4 shrink-0" /> Custody Record
              at launch — $99 per issued record, billed at issue, agency
              keeps any markup
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" /> Cancel anytime;
              engagement archives but credentials stay readable to you
            </li>
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Billing not live yet.</strong> We&apos;re finalizing our
            LLC + Terms of Service before turning on metered billing. The
            first ~10 agencies onto the platform lock $14/mo per engagement
            and $79 per Custody Record forever.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link
            href="/pro-waitlist?tier=founding-cohort"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sherpa-600"
          >
            Join the founding cohort
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
