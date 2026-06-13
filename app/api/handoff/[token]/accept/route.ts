/**
 * POST /api/handoff/[token]/accept
 *
 * SHRP-100e — Client side of the handoff acceptance.
 *
 * Called after the client has:
 *   1. Created their SherpaKeys account (magic-link signup).
 *   2. Set a vault passphrase and generated their X25519 keypair
 *      (the SHRP-107 keypair save runs as part of /vault/setup).
 *
 * This endpoint links the authenticated client to the handoff row and
 * flips status from 'pending_acceptance' to 'pending_rekey'. The agency
 * sees the "ready to transfer" banner on next dashboard refresh.
 *
 * Idempotent — calling on an already-accepted handoff returns 200 with
 * the existing state.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
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

  // Verify the user has finished vault setup — public_key on
  // users row means the keypair exists. We need it for the agency
  // to seal credentials to.
  const { data: userRow } = await supabase
    .from("users")
    .select("public_key")
    .eq("id", user.id)
    .maybeSingle();
  if (!(userRow as { public_key?: string | null } | null)?.public_key) {
    return NextResponse.json(
      {
        error: "no_keypair",
        message:
          "Set up your vault first — we need your public key to receive the encrypted credentials.",
      },
      { status: 412 },
    );
  }

  // Use admin client to look up handoff by token (RLS on
  // engagement_handoffs is by user id; the client doesn't own it yet).
  const admin = createAdminClient();
  const { data: handoffRaw, error: lookupErr } = await admin
    .from("engagement_handoffs")
    .select(
      "id, project_id, agency_user_id, client_email, status, expires_at, revoked_at, accepted_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (lookupErr) {
    return NextResponse.json(
      { error: "lookup_failed", details: lookupErr.message },
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
    client_email: string;
    status: string;
    expires_at: string;
    revoked_at: string | null;
    accepted_at: string | null;
  };

  if (handoff.revoked_at) {
    return NextResponse.json({ error: "revoked" }, { status: 410 });
  }
  if (new Date(handoff.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (handoff.status === "transferred") {
    return NextResponse.json(
      { error: "already_transferred" },
      { status: 410 },
    );
  }
  if (handoff.status === "pending_rekey" || handoff.accepted_at) {
    // Idempotent — return current state.
    return NextResponse.json(
      {
        ok: true,
        already_accepted: true,
        status: handoff.status,
      },
      { status: 200 },
    );
  }

  // Soft check: the email on the handoff should match the
  // authenticated user's email. Not strict — clients may sign up with
  // a different address than the agency typed — but we warn for now.
  const emailMatch =
    user.email?.toLowerCase() === handoff.client_email.toLowerCase();

  const nowIso = new Date().toISOString();
  const { error: upErr } = await admin
    .from("engagement_handoffs")
    .update({
      client_user_id: user.id,
      accepted_at: nowIso,
      status: "pending_rekey",
    } as never)
    .eq("id", handoff.id);
  if (upErr) {
    return NextResponse.json(
      { error: "update_failed", details: upErr.message },
      { status: 500 },
    );
  }

  // Audit-log on the agency's timeline so they see "client accepted".
  await admin.from("audit_log").insert({
    user_id: handoff.agency_user_id,
    project_id: handoff.project_id,
    action: "engagement_handoff_accepted",
    actor: "client",
    metadata: {
      handoff_id: handoff.id,
      client_user_id: user.id,
      email_match: emailMatch,
    },
  } as never);

  return NextResponse.json({ ok: true, status: "pending_rekey" }, { status: 200 });
}
