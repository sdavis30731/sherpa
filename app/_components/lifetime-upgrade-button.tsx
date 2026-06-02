"use client";

/**
 * LifetimeUpgradeButton — client island for the Lifetime tier CTA.
 *
 * On click:
 *   1. POSTs to /api/checkout/lifetime
 *   2. If 401 (not signed in), redirects to /signup?next=/?upgrade=lifetime
 *      so the user can sign up and try again.
 *   3. If 200, redirects the browser to the Stripe Checkout URL.
 *   4. If 4xx/5xx, shows a small inline error.
 */

import * as React from "react";
import { Loader2, KeyRound } from "lucide-react";

interface Props {
  className?: string;
  children: React.ReactNode;
}

export function LifetimeUpgradeButton({ className, children }: Props) {
  const [state, setState] = React.useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/checkout/lifetime", { method: "POST" });

      if (res.status === 401) {
        // Not signed in. Send them to signup with a hint to come back.
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
      // Redirect to Stripe-hosted Checkout.
      window.location.href = body.url as string;
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not start checkout");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={state === "loading"}
        className={className}
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
          </>
        ) : (
          children
        )}
      </button>
      {error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
