/**
 * POST /api/handoff/[token]/complete
 *
 * SHRP-100f — Server side of the cryptographic ownership flip.
 *
 * The agency's browser has decrypted each credential with their vault
 * key, re-encrypted each as an X25519 sealed-box for the client's
 * public key, and POSTs the bundle here. The server:
 *
 *   1. Validates the agency owns the handoff and status is pending_rekey.
 *   2. Verifies every credential in the project is covered by the bundle.
 *   3. UPDATEs each credential with the new sealed-box ciphertext and
 *      flips ciphertext_format to 'agency_sealed_box'.
 *   4. Flips user_id on credentials + projects + rotation_policies.
 *   5. Sets projects.transferred_at + original_owner_user_id + handoff_id.
 *   6. Sets handoff.status='transferred' + handoff.transferred_at.
 *   7. If opted_in_to_paid_vault: INSERT vault_subscriptions row.
 *   8. Audit-logs the transfer on both sides.
 *
 * When the client next unlocks their vault, the SHRP-051g re-wrap loop
 * detects the sealed-box format and silently re-encrypts each credential
 * with their vault key. Same mechanism as auto-rotation. Zero-knowledge
 * preserved.
 *
 * Body: { credentials: [{ credential_id, new_ciphertext_b64 }, ...] }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PostBody {
  credentials?: unknown;
}

interface CredentialUpdate {
  credential_id: string;
  new_ciphertext_b64: string;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

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

  if (!Array.isArray(body.credentials)) {
    return NextResponse.json(
      { error: "credentials_must_be_array" },
      { status: 400 },
    );
  }
  const updates: CredentialUpdate[] = [];
  for (const raw of body.credentials) {
    if (typeof raw !== "object" || !raw) continue;
    const u = raw as { credential_id?: unknown; new_ciphertext_b64?: unknown };
    if (typeof u.credential_id !== "string") continue;
    if (typeof u.new_ciphertext_b64 !== "string") continue;
    if (u.new_ciphertext_b64.length < 64) continue;
    updates.push({
      credential_id: u.credential_id,
      new_ciphertext_b64: u.new_ciphertext_b64,
    });
  }
  if (updates.length === 0) {
    return NextResponse.json(
      { error: "no_valid_credentials_in_bundle" },
      { status: 400 },
    );
  }

  // ─── Validate the handoff via RLS-aware select ─────────────────
  const { data: handoffRaw, error: hErr } = await supabase
    .from("engagement_handoffs")
    .select(
      "id, project_id, agency_user_id, client_user_id, client_email, status, opted_in_to_paid_vault",
    )
    .eq("token", token)
    .maybeSingle();
  if (hErr) {
    return NextResponse.json(
      { error: "lookup_failed", details: hErr.message },
      { status: 500 },
    );
  }
  if (!handoffRaw) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const handoff = handoffRaw as {
    id: string;
    project_id: string;
    agency_user_id: string;
    client_user_id: string | null;
    client_email: string;
    status: string;
    opted_in_to_paid_vault: boolean;
  };

  if (handoff.agency_user_id !== user.id) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }
  if (handoff.status !== "pending_rekey") {
    return NextResponse.json(
      { error: "not_pending_rekey", current_status: handoff.status },
      { status: 409 },
    );
  }
  if (!handoff.client_user_id) {
    return NextResponse.json(
      { error: "client_not_linked" },
      { status: 500 },
    );
  }

  // ─── Verify the bundle covers every credential ─────────────────
  const { data: existingCredsRaw } = await supabase
    .from("credentials")
    .select("id")
    .eq("project_id", handoff.project_id)
    .is("deleted_at", null);
  const existingIds = new Set(
    (existingCredsRaw ?? []).map((c) => (c as { id: string }).id),
  );
  const updateIds = new Set(updates.map((u) => u.credential_id));
  const missing: string[] = [];
  for (const id of existingIds) {
    if (!updateIds.has(id)) missing.push(id);
  }
  const extraneous: string[] = [];
  for (const id of updateIds) {
    if (!existingIds.has(id)) extraneous.push(id);
  }
  if (missing.length > 0 || extraneous.length > 0) {
    return NextResponse.json(
      {
        error: "bundle_mismatch",
        missing,
        extraneous,
        message:
          "The credential bundle doesn't match the engagement's current credentials. Refresh and re-encrypt.",
      },
      { status: 409 },
    );
  }

  // ─── Perform the ownership flip with the admin client so we can
  // bypass RLS during the cross-user UPDATE (the credentials must
  // go from agency_user_id ownership to client_user_id ownership). ─
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const clientUserId = handoff.client_user_id;

  // Re-encrypt + ownership flip per credential.
  for (const u of updates) {
    const { error: credErr } = await admin
      .from("credentials")
      .update({
        ciphertext: u.new_ciphertext_b64,
        ciphertext_format: "agency_sealed_box",
        user_id: clientUserId,
      } as never)
      .eq("id", u.credential_id)
      .eq("project_id", handoff.project_id);
    if (credErr) {
      return NextResponse.json(
        {
          error: "credential_update_failed",
          credential_id: u.credential_id,
          details: credErr.message,
        },
        { status: 500 },
      );
    }
  }

  // Project ownership flip.
  const { error: projErr } = await admin
    .from("projects")
    .update({
      user_id: clientUserId,
      original_owner_user_id: handoff.agency_user_id,
      transferred_at: nowIso,
      handoff_id: handoff.id,
    } as never)
    .eq("id", handoff.project_id);
  if (projErr) {
    return NextResponse.json(
      { error: "project_update_failed", details: projErr.message },
      { status: 500 },
    );
  }

  // Rotation policies move too. Their wrapped credentials are
  // ROTATION_MASTER_KEY-encrypted server-side so no re-wrap is needed.
  await admin
    .from("rotation_policies")
    .update({ user_id: clientUserId } as never)
    .eq("project_id", handoff.project_id);

  // Audit log retroactively rebinds to the new owner so the client
  // sees their engagement's history.
  await admin
    .from("audit_log")
    .update({ user_id: clientUserId } as never)
    .eq("project_id", handoff.project_id);

  // ─── vault_subscriptions row if opted in ───────────────────────
  if (handoff.opted_in_to_paid_vault) {
    await admin.from("vault_subscriptions").insert({
      project_id: handoff.project_id,
      client_user_id: clientUserId,
      agency_user_id: handoff.agency_user_id,
      handoff_id: handoff.id,
      monthly_cents: 700, // founding cohort lock
      status: "founding_cohort_grace",
    } as never);
  }

  // ─── Close the handoff ─────────────────────────────────────────
  await admin
    .from("engagement_handoffs")
    .update({
      status: "transferred",
      rekey_completed_at: nowIso,
      transferred_at: nowIso,
    } as never)
    .eq("id", handoff.id);

  // Audit-log on the agency's side (engagement still references the
  // agency until the row is rebinded above; that already happened, so
  // log against the client user).
  await admin.from("audit_log").insert({
    user_id: clientUserId,
    project_id: handoff.project_id,
    action: "engagement_handoff_transferred",
    actor: "user",
    metadata: {
      handoff_id: handoff.id,
      from_agency_user_id: handoff.agency_user_id,
      credentials_count: updates.length,
      opted_in_to_paid_vault: handoff.opted_in_to_paid_vault,
    },
  } as never);

  return NextResponse.json(
    {
      ok: true,
      transferred_at: nowIso,
      credentials_count: updates.length,
      subscription_started: handoff.opted_in_to_paid_vault,
    },
    { status: 200 },
  );
}
