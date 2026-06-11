/**
 * POST /api/credentials/[id]/rotate-now
 *
 * SHRP-051 — Manual rotation trigger. The button on the credential row
 * hits this; we look up the credential's rotation_policy, validate the
 * caller owns it, then invoke the orchestrator with trigger='manual'.
 *
 * Returns the orchestrator's full audit summary so the result modal
 * can show step-by-step what happened (and what rolled back if
 * anything failed).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRotation } from "@/lib/rotation-orchestrator";
import { isRotationConfigured } from "@/lib/rotation-wrap";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: credentialId } = await ctx.params;

  if (!isRotationConfigured()) {
    return NextResponse.json(
      {
        error: "rotation_not_configured",
        message:
          "ROTATION_MASTER_KEY env var is missing. Auto-rotation is unavailable until it's set.",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated" },
      { status: 401 },
    );
  }

  // Find the policy for this credential. RLS will scope to user.
  const { data: policyRaw, error: pErr } = await supabase
    .from("rotation_policies")
    .select("id, enabled")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (pErr) {
    return NextResponse.json(
      { error: "policy_lookup_failed", details: pErr.message },
      { status: 500 },
    );
  }
  if (!policyRaw) {
    return NextResponse.json(
      {
        error: "no_policy",
        message:
          "This credential has no rotation policy. Enable auto-rotation first.",
      },
      { status: 404 },
    );
  }
  const policy = policyRaw as { id: string; enabled: boolean };
  if (!policy.enabled) {
    return NextResponse.json(
      {
        error: "policy_disabled",
        message: "Rotation is disabled for this credential. Re-enable first.",
      },
      { status: 409 },
    );
  }

  const result = await runRotation({
    policyId: policy.id,
    trigger: "manual",
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
