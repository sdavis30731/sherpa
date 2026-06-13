/**
 * /api/credentials/[id]/rotation-policy
 *
 * SHRP-051 — Create / replace / delete a rotation policy for a credential.
 *
 * POST body shape (agency provides plaintext credentials — server wraps
 * with ROTATION_MASTER_KEY before insert; plaintext never persisted):
 *   {
 *     source_secret: string,            // the credential being rotated
 *     actor_secret?: string,            // higher-privilege creds (Stripe sk_live_)
 *     target_platform: 'vercel',
 *     target_project_ref: string,
 *     target_team_ref?: string,
 *     target_env_var_name: string,
 *     target_env_var_environments?: string[],
 *     target_trigger_redeploy?: boolean,
 *     target_secret: string,            // Vercel access token
 *     interval_days: number,
 *     metadata?: object                 // provider-specific (Stripe scope, etc.)
 *   }
 *
 * Returns the policy id on success. DELETE removes the policy. RLS
 * scopes everything to the authenticated user; we double-check
 * credential ownership for belt-and-suspenders.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wrapForRotation, isRotationConfigured } from "@/lib/rotation-wrap";
import { SUPPORTED_PROVIDERS } from "@/lib/rotation-providers";
import { SUPPORTED_TARGETS } from "@/lib/rotation-targets";

const VALID_ENVS = new Set(["production", "preview", "development"]);

interface PostBody {
  source_secret?: unknown;
  actor_secret?: unknown;
  target_platform?: unknown;
  target_project_ref?: unknown;
  target_team_ref?: unknown;
  target_env_var_name?: unknown;
  target_env_var_environments?: unknown;
  target_trigger_redeploy?: unknown;
  target_secret?: unknown;
  interval_days?: unknown;
  metadata?: unknown;
}

export async function POST(
  req: Request,
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

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // ─── Validate ──────────────────────────────────────────────────
  const sourceSecret =
    typeof body.source_secret === "string" ? body.source_secret.trim() : "";
  const actorSecret =
    typeof body.actor_secret === "string"
      ? body.actor_secret.trim() || null
      : null;
  const targetPlatform =
    typeof body.target_platform === "string"
      ? body.target_platform.toLowerCase()
      : "";
  const targetProjectRef =
    typeof body.target_project_ref === "string"
      ? body.target_project_ref.trim()
      : "";
  const targetTeamRef =
    typeof body.target_team_ref === "string"
      ? body.target_team_ref.trim() || null
      : null;
  const targetEnvVarName =
    typeof body.target_env_var_name === "string"
      ? body.target_env_var_name.trim()
      : "";
  const envsRaw = Array.isArray(body.target_env_var_environments)
    ? body.target_env_var_environments
    : ["production"];
  const targetEnvVarEnvironments = envsRaw
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.toLowerCase())
    .filter((e) => VALID_ENVS.has(e));
  const targetTriggerRedeploy =
    typeof body.target_trigger_redeploy === "boolean"
      ? body.target_trigger_redeploy
      : true;
  const targetSecret =
    typeof body.target_secret === "string" ? body.target_secret.trim() : "";
  const intervalDays =
    typeof body.interval_days === "number" && Number.isFinite(body.interval_days)
      ? Math.round(body.interval_days)
      : 0;
  const metadata =
    body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};

  if (!sourceSecret) {
    return NextResponse.json(
      { error: "missing_source_secret" },
      { status: 400 },
    );
  }
  if (!SUPPORTED_TARGETS.includes(targetPlatform)) {
    return NextResponse.json(
      {
        error: "unsupported_target_platform",
        message: `Supported: ${SUPPORTED_TARGETS.join(", ")}`,
      },
      { status: 400 },
    );
  }
  if (!targetProjectRef) {
    return NextResponse.json(
      { error: "missing_target_project_ref" },
      { status: 400 },
    );
  }
  if (!targetEnvVarName) {
    return NextResponse.json(
      { error: "missing_target_env_var_name" },
      { status: 400 },
    );
  }
  if (targetEnvVarEnvironments.length === 0) {
    return NextResponse.json(
      {
        error: "no_valid_environments",
        message:
          "target_env_var_environments must include at least one of: production, preview, development",
      },
      { status: 400 },
    );
  }
  if (!targetSecret) {
    return NextResponse.json(
      { error: "missing_target_secret" },
      { status: 400 },
    );
  }
  if (intervalDays < 1 || intervalDays > 365) {
    return NextResponse.json(
      { error: "interval_days_out_of_range" },
      { status: 400 },
    );
  }

  // ─── Verify ownership of the credential ────────────────────────
  const { data: credRaw, error: credErr } = await supabase
    .from("credentials")
    .select("id, project_id, service")
    .eq("id", credentialId)
    .maybeSingle();
  if (credErr) {
    return NextResponse.json(
      { error: "credential_lookup_failed", details: credErr.message },
      { status: 500 },
    );
  }
  if (!credRaw) {
    return NextResponse.json({ error: "credential_not_found" }, { status: 404 });
  }
  const credential = credRaw as {
    id: string;
    project_id: string;
    service: string;
  };

  // Sanity check: the credential's service must have a provider adapter.
  if (!SUPPORTED_PROVIDERS.includes(credential.service)) {
    return NextResponse.json(
      {
        error: "unsupported_provider",
        message: `Auto-rotation isn't yet supported for ${credential.service}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  // ─── Wrap secrets + insert/upsert ──────────────────────────────
  let sourceWrapped: string;
  let actorWrapped: string | null;
  let targetWrapped: string;
  try {
    sourceWrapped = wrapForRotation(sourceSecret);
    actorWrapped = actorSecret ? wrapForRotation(actorSecret) : null;
    targetWrapped = wrapForRotation(targetSecret);
  } catch (err) {
    return NextResponse.json(
      {
        error: "wrap_failed",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }

  const nextRotationAt = new Date(
    Date.now() + intervalDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Upsert by credential_id (the unique constraint).
  const { data: upserted, error: upErr } = await supabase
    .from("rotation_policies")
    .upsert(
      {
        credential_id: credential.id,
        user_id: user.id,
        project_id: credential.project_id,
        enabled: true,
        interval_days: intervalDays,
        source_credential_wrapped: sourceWrapped,
        actor_credential_wrapped: actorWrapped,
        target_platform: targetPlatform,
        target_project_ref: targetProjectRef,
        target_team_ref: targetTeamRef,
        target_env_var_name: targetEnvVarName,
        target_env_var_environments: targetEnvVarEnvironments,
        target_trigger_redeploy: targetTriggerRedeploy,
        target_credential_wrapped: targetWrapped,
        metadata,
        next_rotation_at: nextRotationAt,
      } as never,
      { onConflict: "credential_id" },
    )
    .select("id")
    .single();
  if (upErr || !upserted) {
    return NextResponse.json(
      { error: "upsert_failed", details: upErr?.message },
      { status: 500 },
    );
  }

  // Audit-log the policy creation/update.
  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: credential.project_id,
    credential_id: credential.id,
    action: "rotation_policy_set",
    actor: "user",
    metadata: {
      target_platform: targetPlatform,
      interval_days: intervalDays,
      env_var: targetEnvVarName,
    },
  } as never);

  return NextResponse.json(
    { id: (upserted as { id: string }).id, next_rotation_at: nextRotationAt },
    { status: 200 },
  );
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: credentialId } = await ctx.params;

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

  const { data: credRaw } = await supabase
    .from("credentials")
    .select("id, project_id")
    .eq("id", credentialId)
    .maybeSingle();
  if (!credRaw) {
    return NextResponse.json({ error: "credential_not_found" }, { status: 404 });
  }

  const { error: delErr } = await supabase
    .from("rotation_policies")
    .delete()
    .eq("credential_id", credentialId);
  if (delErr) {
    return NextResponse.json(
      { error: "delete_failed", details: delErr.message },
      { status: 500 },
    );
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: (credRaw as { project_id: string }).project_id,
    credential_id: credentialId,
    action: "rotation_policy_removed",
    actor: "user",
    metadata: {},
  } as never);

  return NextResponse.json({ ok: true }, { status: 200 });
}
