"use client";

/**
 * SHRP-097 — Approvals list (left column).
 *
 * Content-masked by default: each row shows the service, the action
 * verb (the .method), and the short action_summary. We do NOT show
 * params, payload, or the full endpoint here — those live in the
 * detail panel and only render once the user has explicitly opened
 * the row.
 *
 * Rationale: the list is what's visible in shoulder-surf and screen-
 * share scenarios. Keeping it terse means a passing glance doesn't
 * leak the request body or amount.
 */

import * as React from "react";
import type { ApprovalListRow } from "../page";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  CircleDot,
} from "lucide-react";

interface Props {
  pending: ApprovalListRow[];
  recent: ApprovalListRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ApprovalList({
  pending,
  recent,
  selectedId,
  onSelect,
}: Props) {
  // Recent that aren't already shown in pending.
  const pendingIds = new Set(pending.map((p) => p.id));
  const recentOnly = recent.filter((r) => !pendingIds.has(r.id));

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending
          </h2>
          <span className="text-xs text-slate-400">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nothing waiting on you.
          </div>
        ) : (
          <ul className="space-y-2">
            {pending.map((row) => (
              <ApprovalRow
                key={row.id}
                row={row}
                selected={row.id === selectedId}
                onSelect={() => onSelect(row.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {recentOnly.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent
            </h2>
            <span className="text-xs text-slate-400">
              {recentOnly.length}
            </span>
          </div>
          <ul className="space-y-2">
            {recentOnly.map((row) => (
              <ApprovalRow
                key={row.id}
                row={row}
                selected={row.id === selectedId}
                onSelect={() => onSelect(row.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ApprovalRow({
  row,
  selected,
  onSelect,
}: {
  row: ApprovalListRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const effectiveStatus =
    row.status === "pending" &&
    new Date(row.expires_at).getTime() < Date.now()
      ? "expired"
      : row.status;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={
          "block w-full rounded-xl border bg-white p-3 text-left transition " +
          (selected
            ? "border-sherpa-400 ring-2 ring-sherpa-200"
            : "border-slate-200 hover:border-slate-300 hover:shadow-sm")
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StatusDot status={effectiveStatus} />
              <span className="truncate text-sm font-semibold text-slate-900">
                {row.service}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                {row.method}
              </span>
            </div>
            {/* Content-masked: action_summary is the highest-signal,
                lowest-leakage field. We deliberately don't render
                row.params or row.agent_prompt here. */}
            <div className="mt-1 truncate text-xs text-slate-600">
              {row.action_summary}
            </div>
          </div>
          <RelativeTime iso={row.created_at} />
        </div>

        {effectiveStatus === "pending" && (
          <ExpiresIn iso={row.expires_at} />
        )}
      </button>
    </li>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span
        aria-label="Pending"
        title="Pending"
        className="inline-flex items-center text-amber-600"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span
        aria-label="Approved"
        title="Approved"
        className="inline-flex items-center text-emerald-600"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span
        aria-label="Rejected"
        title="Rejected"
        className="inline-flex items-center text-red-600"
      >
        <XCircle className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      aria-label="Expired"
      title="Expired"
      className="inline-flex items-center text-slate-400"
    >
      <CircleDot className="h-3.5 w-3.5" />
    </span>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = React.useState(() => relativeFrom(iso));
  React.useEffect(() => {
    const id = setInterval(() => setText(relativeFrom(iso)), 15_000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-400">
      {text}
    </span>
  );
}

function ExpiresIn({ iso }: { iso: string }) {
  const [minutesLeft, setMinutesLeft] = React.useState(() =>
    Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000)),
  );
  React.useEffect(() => {
    const id = setInterval(() => {
      setMinutesLeft(
        Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000)),
      );
    }, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-700">
      <Clock className="h-3 w-3" /> Expires in {minutesLeft} min
    </div>
  );
}

function relativeFrom(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
