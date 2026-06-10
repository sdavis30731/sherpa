"use client";

/**
 * SHRP-097e — Approvals chip in the vault header.
 *
 * Live-updates via Supabase Realtime so the developer sees the count
 * jump and the dot pulse the moment an agent queues an approval. No
 * polling. The initial count is computed server-side and passed in
 * via initialCount so the chip is correct on first paint.
 *
 * Content-masking: the chip never shows the action_summary, params,
 * or any other detail. Just "Approvals (N)". The detail lives behind
 * the click — once you're on the dashboard, you've made an explicit
 * decision to see it.
 */

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "lucide-react";

interface Props {
  userId: string;
  initialCount: number;
}

type RowSnapshot = {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string;
};

export function ApprovalsChip({ userId, initialCount }: Props) {
  const [count, setCount] = React.useState(initialCount);
  // Track "fresh arrival within last 6 seconds" to pulse the chip.
  const [pulsing, setPulsing] = React.useState(false);
  const pulseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Keep a map of pending rows so UPDATEs know whether they moved a row
  // INTO or OUT OF the pending bucket.
  const pendingRef = React.useRef<Map<string, RowSnapshot>>(new Map());

  function recompute() {
    setCount(pendingRef.current.size);
  }

  function triggerPulse() {
    setPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulsing(false), 6000);
  }

  React.useEffect(() => {
    const supabase = createClient();

    // Seed the pending map from the server-rendered count. We don't have
    // per-row data here, so we approximate: the chip count is correct on
    // first paint via initialCount; once subscriptions deliver real rows
    // we switch to authoritative tracking.
    let bootstrappedFromRealtime = false;

    const channel = supabase
      .channel(`approvals_chip:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pending_approvals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as RowSnapshot;
          if (!bootstrappedFromRealtime) {
            bootstrappedFromRealtime = true;
            // First realtime event — drop the seed count and start
            // counting from this point. (The dashboard page itself does
            // the canonical pull; the chip just reflects deltas.)
            pendingRef.current.clear();
            setCount(initialCount);
          }
          if (isPending(row)) {
            pendingRef.current.set(row.id, row);
            recompute();
            triggerPulse();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pending_approvals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as RowSnapshot;
          const was = pendingRef.current.has(row.id);
          const is = isPending(row);
          if (was && !is) {
            pendingRef.current.delete(row.id);
            recompute();
          } else if (!was && is) {
            pendingRef.current.set(row.id, row);
            recompute();
            triggerPulse();
          } else if (is) {
            pendingRef.current.set(row.id, row);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
    // initialCount intentionally not in deps — it's a one-shot seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const hasPending = count > 0;

  return (
    <Link
      href="/vault/approvals"
      className={
        "relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition " +
        (hasPending
          ? "text-amber-700 hover:bg-amber-50"
          : "text-slate-600 hover:text-slate-900")
      }
      title={
        hasPending
          ? `${count} approval${count === 1 ? "" : "s"} pending`
          : "Approvals"
      }
    >
      <span className="relative inline-flex">
        <Bell className="h-4 w-4" />
        {hasPending && (
          <>
            {pulsing && (
              <span className="absolute -inset-1 animate-ping rounded-full bg-amber-400/40" />
            )}
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
              {count > 9 ? "9+" : count}
            </span>
          </>
        )}
      </span>
      <span className="hidden sm:inline">Approvals</span>
    </Link>
  );
}

function isPending(row: RowSnapshot): boolean {
  if (row.status !== "pending") return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  return true;
}
