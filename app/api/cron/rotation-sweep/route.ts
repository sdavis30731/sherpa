/**
 * GET /api/cron/rotation-sweep
 *
 * SHRP-051f — Scheduled auto-rotation sweep. Runs every 15 min via
 * vercel.json. Queries rotation_policies for due rows (enabled AND
 * next_rotation_at < now()), invokes the orchestrator for each with
 * trigger='scheduled', and returns a summary.
 *
 * Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET> if the
 * env var is configured. Same gate as the approvals reminder cron.
 *
 * Concurrency: we process policies serially. v1.1 can parallelize
 * when we know the orchestrator runs cleanly under load. The 8-step
 * orchestrator takes ~3–10 seconds end-to-end (mostly Stripe API
 * latency), so even 100 due policies stays under the 5-minute
 * function-execution ceiling.
 *
 * Each policy gets its own rotation_attempts row; failures don't
 * affect other policies. The sweep records a top-level summary in
 * the response for the agency's audit dashboard view (v1.1).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRotation } from "@/lib/rotation-orchestrator";
import { isRotationConfigured } from "@/lib/rotation-wrap";

export async function GET(request: NextRequest) {
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const authHeader = request.headers.get("authorization");
  if (!expectedAuth || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRotationConfigured()) {
    return NextResponse.json(
      {
        swept_at: new Date().toISOString(),
        skipped: true,
        reason: "rotation_not_configured",
        message: "ROTATION_MASTER_KEY env var missing — sweep skipped.",
      },
      { status: 200 },
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // Pull due policies. The partial index rotation_policies_due_idx
  // covers this predicate (enabled = true).
  const { data: dueRaw, error: queryErr } = await admin
    .from("rotation_policies")
    .select("id")
    .eq("enabled", true)
    .lt("next_rotation_at", nowIso);
  if (queryErr) {
    return NextResponse.json(
      { error: "query_failed", details: queryErr.message },
      { status: 500 },
    );
  }
  const duePolicies = (dueRaw ?? []) as Array<{ id: string }>;

  const results: Array<{
    policy_id: string;
    status: "succeeded" | "rolled_back" | "failed";
    message: string;
  }> = [];
  let succeeded = 0;
  let rolledBack = 0;
  let failed = 0;

  for (const policy of duePolicies) {
    try {
      const r = await runRotation({
        policyId: policy.id,
        trigger: "scheduled",
      });
      results.push({
        policy_id: policy.id,
        status: r.status,
        message: r.message,
      });
      if (r.status === "succeeded") succeeded++;
      else if (r.status === "rolled_back") rolledBack++;
      else failed++;
    } catch (err) {
      // Orchestrator should never throw — but if it does, log and
      // continue with the next policy.
      failed++;
      results.push({
        policy_id: policy.id,
        status: "failed",
        message: err instanceof Error ? err.message : "unknown_error",
      });
      console.error(
        `SHRP-051 cron: orchestrator threw for policy ${policy.id}:`,
        err,
      );
    }
  }

  return NextResponse.json(
    {
      swept_at: nowIso,
      candidate_count: duePolicies.length,
      succeeded,
      rolled_back: rolledBack,
      failed,
      results,
    },
    { status: 200 },
  );
}
