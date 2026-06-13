/**
 * GET /api/handoff/[token]/rekey-info
 *
 * SHRP-100f — Agency-side endpoint that returns everything the
 * agency's browser needs to perform the rekey:
 *
 *   - handoff metadata (status, client identity)
 *   - the client's X25519 public key
 *   - every credential's current vault_key ciphertext for this
 *     engagement (so the agency's browser can decrypt + re-encrypt)
 *
 * Auth required + matches handoff.agency_user_id. Status must be
 * 'pending_rekey' (the client has signed up, set their vault, and
 * accepted).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
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

  // RLS scopes to the agency owner.
  const { data: handoffRaw, error: hErr } = await supabase
    .from("engagement_handoffs")
    .select(
      "id, project_id, agency_user_id, client_user_id, client_email, client_name, status, expires_at, opted_in_to_paid_vault",
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
    client_name: string | null;
    status: string;
    expires_at: string;
    opted_in_to_paid_vault: boolean;
  };

  if (handoff.agency_user_id !== user.id) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  }
  if (handoff.status !== "pending_rekey") {
    return NextResponse.json(
      {
        error: "not_ready",
        message:
          handoff.status === "pending_acceptance"
            ? "Client hasn't accepted yet. We'll let you know the moment they do."
            : handoff.status === "transferred"
              ? "Already transferred."
              : "Handoff was revoked or expired.",
        status: handoff.status,
      },
      { status: 409 },
    );
  }
  if (!handoff.client_user_id) {
    return NextResponse.json(
      { error: "client_not_linked", message: "Internal: handoff is pending_rekey but no client_user_id." },
      { status: 500 },
    );
  }

  // Pull the client's public key.
  const { data: clientRow } = await supabase
    .from("users")
    .select("public_key")
    .eq("id", handoff.client_user_id)
    .maybeSingle();
  const clientPublicKey =
    (clientRow as { public_key?: string | null } | null)?.public_key ?? null;
  if (!clientPublicKey) {
    return NextResponse.json(
      {
        error: "client_no_keypair",
        message:
          "Client hasn't generated their encryption key yet. Ask them to unlock their vault.",
      },
      { status: 412 },
    );
  }

  // Pull all of this engagement's credentials. Only vault_key format
  // — rotation-pending ones (agency_sealed_box) need to be re-wrapped
  // first, which happens on the agency's next vault unlock anyway.
  const { data: credsRaw } = await supabase
    .from("credentials")
    .select(
      "id, service, env, label, ciphertext, ciphertext_format, last_rotated_at, created_at",
    )
    .eq("project_id", handoff.project_id)
    .is("deleted_at", null);
  const credentials = (credsRaw ?? []) as Array<{
    id: string;
    service: string;
    env: string;
    label: string;
    ciphertext: string;
    ciphertext_format: string;
    last_rotated_at: string | null;
    created_at: string;
  }>;

  // Project + agency context for the UI.
  const { data: projectRaw } = await supabase
    .from("projects")
    .select("name, client_name")
    .eq("id", handoff.project_id)
    .maybeSingle();
  const project = projectRaw as {
    name: string;
    client_name: string | null;
  } | null;

  return NextResponse.json(
    {
      handoff: {
        id: handoff.id,
        project_id: handoff.project_id,
        client_email: handoff.client_email,
        client_name: handoff.client_name,
        opted_in_to_paid_vault: handoff.opted_in_to_paid_vault,
      },
      client_public_key: clientPublicKey,
      credentials,
      project: project
        ? { name: project.name, client_name: project.client_name }
        : null,
    },
    { status: 200 },
  );
}
