/**
 * SHRP-051 — Rotation orchestrator.
 *
 * The heart of auto-rotation. Eight ordered steps with structured
 * rollback. Provider- and target-agnostic — drives adapters through
 * the RotationProvider + RotationTarget interfaces.
 *
 * Pipeline:
 *   1. preflight_verify_old   — confirm the current credential still
 *                                works. Catches the "provider already
 *                                revoked it on us" failure mode
 *                                before any destructive step.
 *   2. generate_new           — provider.generateNewKey(). Returns
 *                                new keyId + secret.
 *   3. push_to_target         — target.updateEnvVar() with the new
 *                                secret. We captured the OLD value
 *                                in step 1 for rollback.
 *   4. verify_new             — provider.verifyKey(new secret).
 *                                Confirms the new credential works
 *                                BEFORE we revoke the old one.
 *   5. trigger_redeploy       — target.triggerRedeploy() (optional;
 *                                best-effort). Even if this fails,
 *                                rotation succeeded.
 *   6. revoke_old             — provider.revokeKey(old). If this
 *                                fails the new key is live and the
 *                                old one is too — partial state but
 *                                not broken.
 *   7. update_vault           — write the new ciphertext to the
 *                                credentials table using the agency's
 *                                X25519 public key (sealed-box).
 *                                Agency browser re-wraps on next
 *                                unlock.
 *   8. update_policy          — wrap the new secret with
 *                                ROTATION_MASTER_KEY, write to
 *                                rotation_policies for next cycle.
 *                                Roll next_rotation_at forward.
 *
 * Rollback decisions per step:
 *   step 1 fail  → return ok:false, no rollback
 *   step 2 fail  → return ok:false, no rollback
 *   step 3 fail  → revoke new key (cleanup step 2)
 *   step 4 fail  → rollback target env to old value + revoke new key
 *   step 5 fail  → continue; log it but rotation is "succeeded with
 *                  redeploy failed"
 *   step 6 fail  → continue; log it but rotation is "succeeded with
 *                  cleanup pending"
 *   step 7 fail  → MARK ATTEMPT FAILED — env has new key but vault
 *                  still has old. Agency intervention required.
 *   step 8 fail  → log it, rotation succeeded but next_rotation_at
 *                  wasn't updated (next cycle will retry).
 *
 * The orchestrator never touches plaintext outside this function. All
 * unwraps happen at top, all wraps happen inline, the only return
 * value is an audit summary.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getRotationProvider } from "@/lib/rotation-providers";
import { getRotationTarget } from "@/lib/rotation-targets";
import { wrapForRotation, unwrapForRotation } from "@/lib/rotation-wrap";
import { sealForAgency } from "@/lib/keypair";

export type RotationStep =
  | "preflight_verify_old"
  | "generate_new"
  | "push_to_target"
  | "verify_new"
  | "trigger_redeploy"
  | "revoke_old"
  | "update_vault"
  | "update_policy";

export type StepResult = {
  step: RotationStep;
  at: string;
  ok: boolean;
  reason?: string;
};

export interface OrchestratorResult {
  ok: boolean;
  status: "succeeded" | "rolled_back" | "failed";
  steps: StepResult[];
  rolled_back_steps?: StepResult[];
  old_key_id?: string | null;
  new_key_id?: string | null;
  /** Surface message for the audit log + UI. */
  message: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Run a rotation for the given policy. Caller is the manual
 * /rotate-now route OR the scheduled cron sweep. Inserts a
 * rotation_attempts row on entry, updates it at each step, closes
 * it at exit.
 */
export async function runRotation(args: {
  policyId: string;
  trigger: "manual" | "scheduled";
}): Promise<OrchestratorResult> {
  const admin = createAdminClient();
  const steps: StepResult[] = [];
  const rolledBackSteps: StepResult[] = [];

  function record(step: RotationStep, ok: boolean, reason?: string): void {
    steps.push({ step, at: nowIso(), ok, reason });
  }
  function recordRollback(
    step: RotationStep,
    ok: boolean,
    reason?: string,
  ): void {
    rolledBackSteps.push({ step, at: nowIso(), ok, reason });
  }

  // ─── Load + decrypt the policy ─────────────────────────────────
  const { data: policyRaw, error: pErr } = await admin
    .from("rotation_policies")
    .select(
      "id, credential_id, user_id, project_id, source_credential_wrapped, actor_credential_wrapped, target_platform, target_project_ref, target_team_ref, target_env_var_name, target_env_var_environments, target_trigger_redeploy, target_credential_wrapped, metadata, interval_days",
    )
    .eq("id", args.policyId)
    .maybeSingle();
  if (pErr || !policyRaw) {
    return {
      ok: false,
      status: "failed",
      steps,
      message: `policy_lookup_failed: ${pErr?.message ?? "not_found"}`,
    };
  }
  const policy = policyRaw as {
    id: string;
    credential_id: string;
    user_id: string;
    project_id: string;
    source_credential_wrapped: string;
    actor_credential_wrapped: string | null;
    target_platform: string;
    target_project_ref: string;
    target_team_ref: string | null;
    target_env_var_name: string;
    target_env_var_environments: string[];
    target_trigger_redeploy: boolean;
    target_credential_wrapped: string;
    metadata: Record<string, unknown>;
    interval_days: number;
  };

  const { data: credRaw } = await admin
    .from("credentials")
    .select("id, service, last_rotated_at")
    .eq("id", policy.credential_id)
    .maybeSingle();
  if (!credRaw) {
    return {
      ok: false,
      status: "failed",
      steps,
      message: "credential_not_found",
    };
  }
  const credential = credRaw as { id: string; service: string };

  // ─── Insert attempt row ────────────────────────────────────────
  const { data: attemptRaw, error: aErr } = await admin
    .from("rotation_attempts")
    .insert({
      policy_id: policy.id,
      credential_id: policy.credential_id,
      status: "running",
      steps_completed: [],
      trigger: args.trigger,
    } as never)
    .select("id")
    .single();
  if (aErr || !attemptRaw) {
    return {
      ok: false,
      status: "failed",
      steps,
      message: `attempt_insert_failed: ${aErr?.message}`,
    };
  }
  const attemptId = (attemptRaw as { id: string }).id;

  async function closeAttempt(
    status: "succeeded" | "rolled_back" | "failed",
    extra: {
      old_key_id?: string | null;
      new_key_id?: string | null;
      error_step?: RotationStep;
      error_message?: string;
    },
  ): Promise<void> {
    await admin
      .from("rotation_attempts")
      .update({
        completed_at: nowIso(),
        status,
        steps_completed: steps,
        old_key_id: extra.old_key_id ?? null,
        new_key_id: extra.new_key_id ?? null,
        error_step: extra.error_step ?? null,
        error_message: extra.error_message ?? null,
      } as never)
      .eq("id", attemptId);
  }

  // ─── Decrypt the wrapped material (server-side, one time) ──────
  let sourceSecret: string;
  let actorSecret: string;
  let targetSecret: string;
  try {
    sourceSecret = unwrapForRotation(policy.source_credential_wrapped);
    actorSecret = policy.actor_credential_wrapped
      ? unwrapForRotation(policy.actor_credential_wrapped)
      : sourceSecret;
    targetSecret = unwrapForRotation(policy.target_credential_wrapped);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unwrap_failed";
    await closeAttempt("failed", {
      error_step: "preflight_verify_old",
      error_message: `unwrap: ${msg}`,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      message: `unwrap_failed: ${msg}`,
    };
  }

  // ─── Resolve provider + target ─────────────────────────────────
  const provider = getRotationProvider(credential.service);
  const target = getRotationTarget(policy.target_platform);
  if (!provider) {
    record(
      "generate_new",
      false,
      `provider_not_supported: ${credential.service}`,
    );
    await closeAttempt("failed", {
      error_step: "generate_new",
      error_message: `provider_not_supported: ${credential.service}`,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      message: `provider_not_supported: ${credential.service}`,
    };
  }
  if (!target) {
    record(
      "push_to_target",
      false,
      `target_not_supported: ${policy.target_platform}`,
    );
    await closeAttempt("failed", {
      error_step: "push_to_target",
      error_message: `target_not_supported: ${policy.target_platform}`,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      message: `target_not_supported: ${policy.target_platform}`,
    };
  }

  // ─── Step 1 — preflight verify old ─────────────────────────────
  const pre = await provider.verifyKey(sourceSecret);
  record("preflight_verify_old", pre.ok, pre.ok ? undefined : pre.reason);
  if (!pre.ok) {
    await closeAttempt("failed", {
      error_step: "preflight_verify_old",
      error_message: pre.reason,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      message: `preflight_failed: ${pre.reason}`,
    };
  }

  // ─── Step 2 — generate new ─────────────────────────────────────
  const gen = await provider.generateNewKey({
    actorSecret,
    currentSecret: sourceSecret,
    metadata: policy.metadata,
  });
  record("generate_new", gen.ok, gen.ok ? undefined : gen.reason);
  if (!gen.ok) {
    await closeAttempt("failed", {
      error_step: "generate_new",
      error_message: gen.reason,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      message: `generate_failed: ${gen.reason}`,
    };
  }
  const newKeyId = gen.newKeyId;
  const newSecret = gen.newSecret;

  // ─── Step 3 — push to target ───────────────────────────────────
  // Capture the OLD env value first so we can roll back if step 4 fails.
  const oldEnv = await target.getEnvVar({
    targetSecret,
    projectRef: policy.target_project_ref,
    teamRef: policy.target_team_ref,
    envVarName: policy.target_env_var_name,
    environments: policy.target_env_var_environments,
  });
  if (!oldEnv.ok) {
    record("push_to_target", false, `get_env_failed: ${oldEnv.reason}`);
    // Rollback step 2: revoke the new key we just created.
    const rb = await provider.revokeKey({ actorSecret, keyId: newKeyId });
    recordRollback(
      "revoke_old",
      rb.ok,
      rb.ok ? "revoked new key (rollback)" : rb.reason,
    );
    await closeAttempt("rolled_back", {
      new_key_id: newKeyId,
      error_step: "push_to_target",
      error_message: `get_env_failed: ${oldEnv.reason}`,
    });
    return {
      ok: false,
      status: "rolled_back",
      steps,
      rolled_back_steps: rolledBackSteps,
      new_key_id: newKeyId,
      message: `get_env_failed: ${oldEnv.reason}`,
    };
  }
  const oldEnvValue = oldEnv.value;
  const oldEnvRemoteId = oldEnv.remoteId;

  const push = await target.updateEnvVar({
    targetSecret,
    projectRef: policy.target_project_ref,
    teamRef: policy.target_team_ref,
    envVarName: policy.target_env_var_name,
    environments: policy.target_env_var_environments,
    value: newSecret,
    remoteId: oldEnvRemoteId,
  });
  record("push_to_target", push.ok, push.ok ? undefined : push.reason);
  if (!push.ok) {
    const rb = await provider.revokeKey({ actorSecret, keyId: newKeyId });
    recordRollback(
      "revoke_old",
      rb.ok,
      rb.ok ? "revoked new key (rollback)" : rb.reason,
    );
    await closeAttempt("rolled_back", {
      new_key_id: newKeyId,
      error_step: "push_to_target",
      error_message: push.reason,
    });
    return {
      ok: false,
      status: "rolled_back",
      steps,
      rolled_back_steps: rolledBackSteps,
      new_key_id: newKeyId,
      message: `push_failed: ${push.reason}`,
    };
  }

  // ─── Step 4 — verify new ───────────────────────────────────────
  const verify = await provider.verifyKey(newSecret);
  record("verify_new", verify.ok, verify.ok ? undefined : verify.reason);
  if (!verify.ok) {
    // Full rollback: env var back to old + revoke new key.
    if (oldEnvValue !== null) {
      const rbEnv = await target.rollbackEnvVar({
        targetSecret,
        projectRef: policy.target_project_ref,
        teamRef: policy.target_team_ref,
        envVarName: policy.target_env_var_name,
        environments: policy.target_env_var_environments,
        value: oldEnvValue,
        remoteId: oldEnvRemoteId,
      });
      recordRollback(
        "push_to_target",
        rbEnv.ok,
        rbEnv.ok ? "env restored" : rbEnv.reason,
      );
    } else {
      recordRollback(
        "push_to_target",
        true,
        "no prior env value to restore",
      );
    }
    const rbKey = await provider.revokeKey({ actorSecret, keyId: newKeyId });
    recordRollback(
      "revoke_old",
      rbKey.ok,
      rbKey.ok ? "revoked new key" : rbKey.reason,
    );
    await closeAttempt("rolled_back", {
      new_key_id: newKeyId,
      error_step: "verify_new",
      error_message: verify.reason,
    });
    return {
      ok: false,
      status: "rolled_back",
      steps,
      rolled_back_steps: rolledBackSteps,
      new_key_id: newKeyId,
      message: `verify_failed: ${verify.reason}`,
    };
  }

  // ─── Step 5 — trigger redeploy (best-effort) ───────────────────
  if (policy.target_trigger_redeploy && target.triggerRedeploy) {
    const rd = await target.triggerRedeploy({
      targetSecret,
      projectRef: policy.target_project_ref,
      teamRef: policy.target_team_ref,
    });
    record("trigger_redeploy", rd.ok, rd.ok ? undefined : rd.reason);
    // Even if redeploy fails, rotation continues — env var update IS
    // the rotation; redeploy is convenience.
  } else {
    record(
      "trigger_redeploy",
      true,
      "skipped (target_trigger_redeploy=false)",
    );
  }

  // ─── Step 6 — revoke old ───────────────────────────────────────
  // Look up the old key id from the most recent prior attempt OR
  // accept that we don't have it (when the policy was newly enabled,
  // the source was just stored, never minted by us). In that case we
  // can't revoke — log it.
  // For v1 we record the new key id in metadata; old key id is null
  // on first rotation.
  const { data: priorAttempt } = await admin
    .from("rotation_attempts")
    .select("new_key_id")
    .eq("policy_id", policy.id)
    .eq("status", "succeeded")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const oldKeyId = (priorAttempt as { new_key_id?: string } | null)?.new_key_id ?? null;
  if (oldKeyId) {
    const rev = await provider.revokeKey({
      actorSecret,
      keyId: oldKeyId,
    });
    record("revoke_old", rev.ok, rev.ok ? undefined : rev.reason);
    // Even if revoke fails, the new key is live. Continue.
  } else {
    record(
      "revoke_old",
      true,
      "no prior key id on file (first rotation)",
    );
  }

  // ─── Step 7 — update vault (sealed-box) ────────────────────────
  // Get the agency's X25519 public key.
  const { data: userRow } = await admin
    .from("users")
    .select("public_key")
    .eq("id", policy.user_id)
    .maybeSingle();
  const agencyPublicKey = (
    userRow as { public_key: string | null } | null
  )?.public_key;
  if (!agencyPublicKey) {
    record("update_vault", false, "no_agency_public_key");
    await closeAttempt("failed", {
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      error_step: "update_vault",
      error_message: "no_agency_public_key",
    });
    return {
      ok: false,
      status: "failed",
      steps,
      rolled_back_steps: rolledBackSteps,
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      message:
        "no_agency_public_key — agency must unlock vault once to generate keypair before auto-rotation can store rotated credentials",
    };
  }
  let sealedNew: string;
  try {
    sealedNew = await sealForAgency(newSecret, agencyPublicKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "seal_failed";
    record("update_vault", false, msg);
    await closeAttempt("failed", {
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      error_step: "update_vault",
      error_message: msg,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      message: `seal_failed: ${msg}`,
    };
  }
  const { error: credUpErr } = await admin
    .from("credentials")
    .update({
      ciphertext: sealedNew,
      ciphertext_format: "agency_sealed_box",
      last_rotated_at: nowIso(),
    } as never)
    .eq("id", credential.id);
  if (credUpErr) {
    record("update_vault", false, credUpErr.message);
    await closeAttempt("failed", {
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      error_step: "update_vault",
      error_message: credUpErr.message,
    });
    return {
      ok: false,
      status: "failed",
      steps,
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      message: `vault_write_failed: ${credUpErr.message}`,
    };
  }
  record("update_vault", true);

  // ─── Step 8 — update policy ────────────────────────────────────
  const newWrapped = wrapForRotation(newSecret);
  const nextRotationAt = new Date(
    Date.now() + policy.interval_days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error: polUpErr } = await admin
    .from("rotation_policies")
    .update({
      source_credential_wrapped: newWrapped,
      last_rotation_at: nowIso(),
      next_rotation_at: nextRotationAt,
    } as never)
    .eq("id", policy.id);
  if (polUpErr) {
    record("update_policy", false, polUpErr.message);
    // The rotation effectively succeeded — just couldn't schedule
    // the next one. Mark succeeded; the next sweep will skip this
    // policy until next_rotation_at is updated manually OR the cron
    // will retry by re-running the rotation (which is safe because
    // it'll see step 1 succeed on the NEW key that's now in the
    // vault).
    await closeAttempt("succeeded", {
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      error_step: "update_policy",
      error_message: polUpErr.message,
    });
    return {
      ok: true,
      status: "succeeded",
      steps,
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      message: `rotated; policy update warning: ${polUpErr.message}`,
    };
  }
  record("update_policy", true);

  // Audit log entry for the engagement's timeline.
  await admin.from("audit_log").insert({
    user_id: policy.user_id,
    project_id: policy.project_id,
    credential_id: policy.credential_id,
    action: "credential_rotated",
    actor: args.trigger === "manual" ? "user" : "system",
    metadata: {
      via: "rotation_orchestrator",
      trigger: args.trigger,
      target_platform: policy.target_platform,
      new_key_id: newKeyId,
      old_key_id: oldKeyId,
    },
  } as never);

  await closeAttempt("succeeded", {
    old_key_id: oldKeyId,
    new_key_id: newKeyId,
  });
  return {
    ok: true,
    status: "succeeded",
    steps,
    old_key_id: oldKeyId,
    new_key_id: newKeyId,
    message: `rotated ${credential.service}; next rotation ${nextRotationAt}`,
  };
}
