/**
 * /approve/[id] — SHRP-042 Stage 2
 *
 * The "AI firewall" approval page. A user lands here from the email link.
 * Server component loads the pending_approvals row via RLS; client island
 * handles the Approve/Reject submission.
 *
 * Handles four entry states:
 *   - pending      → show action card + Approve/Reject buttons
 *   - approved     → show "Approved, executed" with result status
 *   - rejected     → show "Rejected" confirmation
 *   - expired      → show "Expired" message
 *   - not found    → 404 page (no approval with that ID for this user)
 *
 * If the user isn't signed in, redirect to /login?next=/approve/[id].
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, AlertTriangle, Clock, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { ApproveRejectControls } from "./_components/approve-reject-controls";

interface ApprovalRow {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  service: string;
  endpoint: string;
  method: string;
  params: Record<string, unknown> | null;
  action_summary: string;
  dollar_amount_cents: number | null;
  agent_prompt: string | null;
  expires_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  result_status_code: number | null;
  result_body: string | null;
  executed_at: string | null;
}

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/approve/${id}`);
  }

  const { data, error } = await supabase
    .from("pending_approvals")
    .select(
      "id, status, service, endpoint, method, params, action_summary, dollar_amount_cents, agent_prompt, expires_at, approved_at, rejected_at, created_at, result_status_code, result_body, executed_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    notFound();
  }
  const approval = data as ApprovalRow;

  // Auto-mark as expired if the deadline has passed but the row is still
  // showing 'pending'. The sweeper cron does this eventually; this just
  // makes the UX honest in the meantime.
  const effectiveStatus =
    approval.status === "pending" &&
    new Date(approval.expires_at).getTime() < Date.now()
      ? "expired"
      : approval.status;

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-16">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold tracking-tight">
          <span className="text-slate-900">Sherpa</span>
          <span className="text-sherpa-500">Keys</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sherpa-600">
          AI Firewall
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {effectiveStatus === "pending"
            ? "An AI agent wants to do something. Approve?"
            : effectiveStatus === "approved"
              ? "Approved"
              : effectiveStatus === "rejected"
                ? "Rejected"
                : "Expired"}
        </h1>
      </div>

      {/* Action card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04] ring-1 ring-slate-900/5">
        {/* Status stripe */}
        <StatusStripe status={effectiveStatus} expiresAt={approval.expires_at} />

        <div className="space-y-5 p-6 sm:p-8">
          {/* Service + endpoint summary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Proposed action
            </p>
            <p className="mt-2 break-all rounded-xl bg-slate-50 p-3 font-mono text-sm text-slate-900 ring-1 ring-slate-200">
              {approval.action_summary}
            </p>
          </div>

          {/* Dollar amount, if applicable */}
          {approval.dollar_amount_cents !== null && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-red-700">
                ${(approval.dollar_amount_cents / 100).toFixed(2)}
              </p>
            </div>
          )}

          {/* Agent prompt, if available */}
          {approval.agent_prompt && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                The prompt that triggered this
              </p>
              <blockquote className="mt-2 border-l-4 border-slate-300 bg-slate-50 p-3 text-sm italic text-slate-700">
                {approval.agent_prompt}
              </blockquote>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Service" value={approval.service} />
            <Field label="Method" value={approval.method.toUpperCase()} />
            <Field label="Endpoint" value={approval.endpoint} />
            <Field
              label="Requested"
              value={new Date(approval.created_at).toLocaleString()}
            />
          </div>

          {/* Outcome states */}
          {effectiveStatus === "pending" && (
            <ApproveRejectControls approvalId={approval.id} />
          )}

          {effectiveStatus === "approved" && approval.result_status_code !== null && (
            <ResultPanel
              statusCode={approval.result_status_code}
              body={approval.result_body}
              executedAt={approval.executed_at}
            />
          )}

          {effectiveStatus === "rejected" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              You rejected this request. The agent received an error and the
              upstream call was never made.
            </div>
          )}

          {effectiveStatus === "expired" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>This approval expired.</strong> The agent will see a
              clear failure on its next status check. If you still want the
              action to happen, ask the agent to request it again.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-slate-400">
        SherpaKeys — the keychain for AI-built apps.{" "}
        <Link href="/" className="text-slate-600 hover:underline">
          Home
        </Link>
      </p>
    </main>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatusStripe({
  status,
  expiresAt,
}: {
  status: "pending" | "approved" | "rejected" | "expired";
  expiresAt: string;
}) {
  if (status === "pending") {
    const minutesLeft = Math.max(
      0,
      Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000),
    );
    return (
      <div className="flex items-center justify-between bg-amber-50 px-6 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> Awaiting your decision
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Expires in {minutesLeft} min
        </span>
      </div>
    );
  }
  if (status === "approved") {
    return (
      <div className="flex items-center gap-1.5 bg-emerald-50 px-6 py-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved and executed
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-1.5 bg-red-50 px-6 py-2.5 text-xs font-semibold text-red-800 ring-1 ring-red-200">
        <XCircle className="h-3.5 w-3.5" /> Rejected
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 bg-slate-100 px-6 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
      <Clock className="h-3.5 w-3.5" /> Expired
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs text-slate-900">{value}</div>
    </div>
  );
}

function ResultPanel({
  statusCode,
  body,
  executedAt,
}: {
  statusCode: number;
  body: string | null;
  executedAt: string | null;
}) {
  const ok = statusCode >= 200 && statusCode < 300;
  const truncated = body && body.length > 600 ? body.slice(0, 600) + "..." : body;
  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-red-200 bg-red-50 text-red-900"
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span>
          <strong>{statusCode}</strong>{" "}
          {ok
            ? "— call succeeded. The agent can fetch the response."
            : "— upstream returned an error."}
        </span>
      </div>
      {truncated && (
        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-slate-700">
            Response body (first 600 chars)
          </summary>
          <pre className="overflow-x-auto px-4 pb-3 font-mono text-[11px] text-slate-700">
            {truncated}
          </pre>
        </details>
      )}
      {executedAt && (
        <p className="text-[11px] text-slate-500">
          Executed {new Date(executedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
