"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Infinity as InfinityIcon, Loader2 } from "lucide-react";

/**
 * Paywall dialog — opens when a free-tier user hits the 1-project limit
 * (SHRP-008). Wired to the real Stripe Checkout flow as of SHRP-045.
 *
 * Click "Upgrade to Lifetime" → POSTs to /api/checkout/lifetime → redirects
 * to Stripe-hosted Checkout. Stripe takes care of the payment UI; we
 * receive the user back at /thanks-for-upgrading and the webhook flips
 * their plan to lifetime.
 */
export function PaywallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [error, setError] = React.useState<string | null>(null);

  async function onUpgrade() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/checkout/lifetime", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/signup?next=lifetime";
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      if (!body.url) {
        throw new Error("Checkout URL missing from server response");
      }
      window.location.href = body.url as string;
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not start checkout");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="You're out of free projects"
      description="The free tier allows one project. Upgrade to Lifetime for unlimited."
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={state === "loading"}
          >
            Close
          </Button>
          <Button onClick={onUpgrade} disabled={state === "loading"}>
            {state === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
              </>
            ) : (
              <>Upgrade to Lifetime · $19</>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500">
          Secure checkout via Stripe. Refunds available within 14 days.
        </p>
      </div>
    </Dialog>
  );
}
