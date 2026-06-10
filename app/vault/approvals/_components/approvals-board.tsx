"use client";

/**
 * SHRP-097 — Approvals dashboard interactive surface.
 *
 * Layout: list on the left, detail on the right (stacked on mobile).
 * Real-time subscription via Supabase Realtime — INSERTs slot new
 * pending rows into the top of the pending list, UPDATEs replace rows
 * in place. RLS already restricts the publication feed to this user's
 * rows so the subscription needs no explicit auth wiring.
 *
 * Selecting a row claims it (POST /api/approvals/[id]/claim) so the
 * email fallback cron suppresses the email — your eyeballs are on it,
 * you don't need a notification too. Approve / Reject reuse the
 * existing /api/approvals/[id]/approve|reject endpoints.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ApprovalListRow } from "../page";
import { ApprovalList } from "./approval-list";
import { ApprovalDetailPanel } from "./approval-detail-panel";
import { Card, CardBody } from "@/components/ui/card";
import { Inbox } from "lucide-react";

interface Props {
  userId: string;
  initialPending: ApprovalListRow[];
  initialRecent: ApprovalListRow[];
}

/**
 * Merges INSERT/UPDATE Realtime payloads into either the pending list
 * (when status='pending' AND not expired) or the recent list.
 */
function mergeRealtime(
  prev: {
    pending: ApprovalListRow[];
    recent: ApprovalListRow[];
  },
  incoming: ApprovalListRow,
): { pending: ApprovalListRow[]; recent: ApprovalListRow[] } {
  const nowMs = Date.now();
  const expired = new Date(incoming.expires_at).getTime() < nowMs;
  const isPending = incoming.status === "pending" && !expired;

  // Update pending list
  const pendingWithoutIncoming = prev.pending.filter(
    (r) => r.id !== incoming.id,
  );
  const pending = isPending
    ? [incoming, ...pendingWithoutIncoming].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      )
    : pendingWithoutIncoming;

  // Recent list — always replace the row, keep order by created_at desc.
  const recentWithoutIncoming = prev.recent.filter(
    (r) => r.id !== incoming.id,
  );
  const recent = [incoming, ...recentWithoutIncoming]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    )
    .slice(0, 25);

  return { pending, recent };
}

export function ApprovalsBoard({
  userId,
  initialPending,
  initialRecent,
}: Props) {
  const router = useRouter();
  const [state, setState] = React.useState<{
    pending: ApprovalListRow[];
    recent: ApprovalListRow[];
  }>({ pending: initialPending, recent: initialRecent });

  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialPending[0]?.id ?? null,
  );

  // ─────────────── Realtime subscription ───────────────
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pending_approvals:user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pending_approvals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as ApprovalListRow;
          setState((prev) => mergeRealtime(prev, row));
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
          const row = payload.new as ApprovalListRow;
          setState((prev) => mergeRealtime(prev, row));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ─────────────── Claim-on-select ───────────────
  // When the user picks a pending row that hasn't been claimed yet, POST
  // to /claim so the email fallback is suppressed. Fire-and-forget — we
  // don't block the UI on it.
  const claimedRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!selectedId) return;
    if (claimedRef.current.has(selectedId)) return;

    const row =
      state.pending.find((r) => r.id === selectedId) ??
      state.recent.find((r) => r.id === selectedId);
    if (!row) return;
    if (row.status !== "pending") return;
    if (row.notified_via) return;

    claimedRef.current.add(selectedId);
    fetch(`/api/approvals/${selectedId}/claim`, { method: "POST" }).catch(
      () => {
        // Don't unclaim on failure — the worst case is a duplicate email,
        // which is a noisy bug, not a security one.
      },
    );
  }, [selectedId, state.pending, state.recent]);

  const selectedRow =
    state.pending.find((r) => r.id === selectedId) ??
    state.recent.find((r) => r.id === selectedId) ??
    null;

  const hasAny =
    state.pending.length > 0 || state.recent.length > 0;

  if (!hasAny) {
    return (
      <Card>
        <CardBody className="py-16 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-base font-semibold text-slate-900">
            No approvals yet.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            When an AI agent tries to write something through SherpaKeys, the
            request will appear here for your decision. New requests show up
            instantly while this page is open.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <ApprovalList
          pending={state.pending}
          recent={state.recent}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>
      <div className="lg:col-span-7">
        <ApprovalDetailPanel
          row={selectedRow}
          onChanged={() => router.refresh()}
        />
      </div>
    </div>
  );
}
