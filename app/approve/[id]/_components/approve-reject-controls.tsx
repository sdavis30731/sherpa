"use client";

/**
 * Approve / Reject buttons for the AI Firewall approval page.
 *
 * Client island only — the rest of the page is server-rendered. We hit
 * the POST endpoints, then either render an inline confirmation or
 * refresh the page so the server-side state is the source of truth.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function ApproveRejectControls({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<
    "idle" | "approving" | "rejecting" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onApprove() {
    setState("approving");
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      // Refresh server component to render the executed state
      router.refresh();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function onReject() {
    setState("rejecting");
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  const busy = state === "approving" || state === "rejecting";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "approving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve and execute
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "rejecting" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Reject
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}
      <p className="text-center text-[11px] text-slate-500">
        Approve only if you understand the action above. The credential is
        decrypted server-side just long enough to make the call — the
        agent never sees it.
      </p>
    </div>
  );
}
