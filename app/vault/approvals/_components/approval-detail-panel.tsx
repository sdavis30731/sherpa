"use client";

/**
 * SHRP-097 — Approval detail panel (right column).
 *
 * Shows the full action context for the currently selected approval
 * row, plus Approve / Reject buttons that reuse the existing
 * /api/approvals/[id]/approve|reject endpoints (same handlers the
 * email-link flow uses).
 *
 * High-risk gating: if the action looks destructive — dollar amount
 * present, OR action_summary contains delete/drop/destroy/remove —
 * we require the user to type a confirm phrase before the approve
 * button fires. v1.1 will swap this for a vault-passphrase prompt
 * once we have data on whether the friction is appropriate.
 */

import * as React from "react";
import type { ApprovalListRow } from "../page";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface Props {
  row: ApprovalListRow | null;
  onChanged: () => void;
}

const DESTRUCTIVE_PATTERN = /\b(delete|drop|destroy|remove|wipe|reset|purge|deactivate|cancel)\b/i;

/**
 * Heuristic: is this action "high-risk" enough to require an extra
 * confirmation step before the approve button does anything? We treat
 * anything with a dollar value, or anything whose human-readable
 * summary contains a destructive verb, as high-risk.
 */
function classifyRisk(row: ApprovalListRow): {
  highRisk: boolean;
  reason: string;
} {
  if (row.dollar_amount_cents !== null && row.dollar_amount_cents > 0) {
    return {
      highRisk: true,
      reason: `This moves $${(row.dollar_amount_cents / 100).toFixed(2)}.`,
    };
  }
  if (DESTRUCTIVE_PATTERN.test(row.action_summary)) {
    return {
      highRisk: true,
      reason: "This looks destructive — once executed, it can't be undone.",
    };
  }
  return { highRisk: false, reason: "" };
}

export function ApprovalDetailPanel({ row, onChanged }: Props) {
  if (!row) {
    return (
      <Card>
        <CardBody className="flex h-full min-h-[300px] items-center justify-center text-center">
          <div className="space-y-2 text-sm text-slate-500">
            <p>Select an approval to see the details.</p>
            <p className="text-xs text-slate-400">
              New requests arrive here live.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return <ApprovalDetail key={row.id} row={row} onChanged={onChanged} />;
}

function ApprovalDetail({
  row,
  onChanged,
}: {
  row: ApprovalListRow;
  onChanged: () => void;
}) {
  const effectiveStatus =
    row.status === "pending" &&
    new Date(row.expires_at).getTime() < Date.now()
      ? "expired"
      : row.status;

  const risk = classifyRisk(row);
  const [confirmPhrase, setConfirmPhrase] = React.useState("");
  const expectedPhrase = "approve";
  const confirmOk =
    !risk.highRisk ||
    confirmPhrase.trim().toLowerCase() === expectedPhrase;

  const [state, setState] = React.useState<
    "idle" | "approving" | "rejecting" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onApprove() {
    setState("approving");
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${row.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to approve.");
    }
  }

  async function onReject() {
    setState("rejecting");
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${row.id}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to reject.");
    }
  }

  const busy = state === "approving" || state === "rejecting";

  return (
    <Card>
      <CardBody className="space-y-5 p-6">
        <StatusBanner status={effectiveStatus} expiresAt={row.expires_at} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Service
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {row.service}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Proposed action
          </p>
          <p className="mt-2 break-words rounded-xl bg-slate-50 p-3 font-mono text-sm text-slate-900 ring-1 ring-slate-200">
            {row.action_summary}
          </p>
        </div>

        {row.dollar_amount_cents !== null && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-red-700">
              ${(row.dollar_amount_cents / 100).toFixed(2)}
            </p>
          </div>
        )}

        {row.agent_prompt && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              The prompt that triggered this
            </p>
            <blockquote className="mt-2 border-l-4 border-slate-300 bg-slate-50 p-3 text-sm italic text-slate-700">
              {row.agent_prompt}
            </blockquote>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field
            label="Method"
            value={row.method.toUpperCase()}
            mono
          />
          <Field
            label="Requested"
            value={new Date(row.created_at).toLocaleString()}
          />
          <Field
            label="Endpoint"
            value={row.endpoint}
            mono
            full
          />
        </div>

        {row.params && Object.keys(row.params).length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-slate-700">
              Request body
            </summary>
            <pre className="overflow-x-auto px-4 pb-3 font-mono text-[11px] text-slate-700">
              {JSON.stringify(row.params, null, 2)}
            </pre>
          </details>
        )}

        {effectiveStatus === "pending" && (
          <>
            {risk.highRisk && (
              <div className="space-y-2 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2 text-sm font-semibold text-red-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>High-risk action</span>
                </div>
                <p className="text-xs text-red-800">{risk.reason}</p>
                <label className="block text-xs font-medium text-red-900">
                  Type{" "}
                  <span className="font-mono font-bold">{expectedPhrase}</span>{" "}
                  to confirm.
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="block w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder={expectedPhrase}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onApprove}
                disabled={busy || !confirmOk}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-500/30 transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "approving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve and execute
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={onReject}
                disabled={busy}
              >
                {state === "rejecting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-700">{error}</p>
            )}
            <p className="text-[11px] text-slate-500">
              The credential is decrypted server-side just long enough to make
              the call — the agent never sees it.
            </p>
          </>
        )}

        {effectiveStatus !== "pending" && (
          <OutcomeFooter row={row} />
        )}
      </CardBody>
    </Card>
  );
}

function StatusBanner({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt: string;
}) {
  if (status === "pending") {
    const minutesLeft = Math.max(
      0,
      Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000),
    );
    return (
      <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Awaiting your decision
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Expires in {minutesLeft} min
        </span>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved and executed
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 ring-1 ring-red-200">
        <XCircle className="h-3.5 w-3.5" /> Rejected
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
      <Clock className="h-3.5 w-3.5" /> Expired
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border border-slate-200 bg-white p-3 " +
        (full ? "sm:col-span-2" : "")
      }
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={
          "mt-0.5 break-words text-xs text-slate-900 " +
          (mono ? "font-mono" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

function OutcomeFooter({ row }: { row: ApprovalListRow }) {
  if (row.status === "approved") {
    return (
      <p className="text-xs text-slate-500">
        Approved{" "}
        {row.approved_at
          ? `on ${new Date(row.approved_at).toLocaleString()}`
          : ""}
        . The agent can fetch the response via{" "}
        <span className="font-mono">sherpa_get_approval_result</span>.
      </p>
    );
  }
  if (row.status === "rejected") {
    return (
      <p className="text-xs text-slate-500">
        Rejected{" "}
        {row.rejected_at
          ? `on ${new Date(row.rejected_at).toLocaleString()}`
          : ""}
        . The agent saw an error; no upstream call was made.
      </p>
    );
  }
  return (
    <p className="text-xs text-slate-500">
      Expired. The agent saw a clear failure. If you still want the action,
      ask the agent to request it again.
    </p>
  );
}
