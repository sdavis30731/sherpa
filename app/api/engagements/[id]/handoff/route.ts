/**
 * POST   /api/engagements/[id]/handoff
 * DELETE /api/engagements/[id]/handoff
 *
 * SHRP-100 — Agency-side initiation of a vault handoff to the client.
 *
 * POST body:
 *   {
 *     client_email: string,
 *     client_name?: string,
 *     agency_message?: string,
 *     opted_in_to_paid_vault?: boolean
 *   }
 *
 * Validates that the engagement is launched + Custody Record issued
 * (you can't hand off something you haven't finished). Generates a
 * 256-bit URL-safe token, inserts an engagement_handoffs row, sends
 * the branded handoff email via Resend, and returns the share URL.
 *
 * DELETE revokes any pending handoff (status='pending_acceptance' or
 * 'pending_rekey'). Status flips to 'revoked'. Already-transferred
 * handoffs cannot be undone — ownership is over.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendHandoffInviteEmail } from "@/lib/email";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/agency";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

interface PostBody {
  client_email?: unknown;
  client_name?: unknown;
  agency_message?: unknown;
  opted_in_to_paid_vault?: unknown;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;

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

  const clientEmail =
    typeof body.client_email === "string" ? body.client_email.trim() : "";
  const clientName =
    typeof body.client_name === "string" ? body.client_name.trim() : "";
  const agencyMessage =
    typeof body.agency_message === "string" ? body.agency_message.trim() : "";
  const optedInToPaidVault =
    typeof body.opted_in_to_paid_vault === "boolean"
      ? body.opted_in_to_paid_vault
      : false;

  if (!clientEmail || !/.+@.+\..+/.test(clientEmail)) {
    return NextResponse.json(
      { error: "invalid_client_email" },
      { status: 400 },
    );
  }

  // ─── Verify the engagement is ready to hand off ────────────────
  const { data: projectRaw, error: projErr } = await supabase
    .from("projects")
    .select("id, name, client_name, status, custody_assertions, transferred_at")
    .eq("id", projectId)
    .maybeSingle();
  if (projErr) {
    return NextResponse.json(
      { error: "project_lookup_failed", details: projErr.message },
      { status: 500 },
    );
  }
  if (!projectRaw) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }
  const project = projectRaw as {
    id: string;
    name: string;
    client_name: string | null;
    status: string;
    custody_assertions: Record<string, unknown> | null;
    transferred_at: string | null;
  };

  if (project.transferred_at) {
    return NextResponse.json(
      {
        error: "already_transferred",
        message: "This engagement has already been handed off to a client.",
      },
      { status: 409 },
    );
  }
  if (project.status !== "launched") {
    return NextResponse.json(
      {
        error: "not_launched",
        message:
          "Mark the engagement as launched before handing off — clients shouldn't take over work-in-progress.",
      },
      { status: 412 },
    );
  }
  const issuedAt =
    project.custody_assertions && typeof project.custody_assertions === "object"
      ? (project.custody_assertions as { issued_at?: unknown }).issued_at
      : undefined;
  if (!issuedAt || typeof issuedAt !== "string") {
    return NextResponse.json(
      {
        error: "custody_not_issued",
        message:
          "Issue the Custody Record before handing off — the client needs the official record.",
      },
      { status: 412 },
    );
  }

  // ─── Check for an existing in-flight handoff ───────────────────
  const { data: existing } = await supabase
    .from("engagement_handoffs")
    .select("id, status")
    .eq("project_id", projectId)
    .in("status", ["pending_acceptance", "pending_rekey"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        error: "handoff_in_flight",
        message:
          "There's already a handoff in progress for this engagement. Revoke it first if you want to re-initiate.",
      },
      { status: 409 },
    );
  }

  // ─── Pull agency identity for the email ────────────────────────
  const { data: agencyRaw } = await supabase
    .from("agency_profiles")
    .select("name, logo_url, primary_color")
    .eq("user_id", user.id)
    .maybeSingle();
  const agency = (agencyRaw as {
    name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
  } | null) ?? null;

  // ─── Insert the handoff row + send email ───────────────────────
  const token = generateToken();
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpakeys.com";
  const shareUrl = `${baseUrl.replace(/\/+$/, "")}/handoff/${token}`;

  const { data: inserted, error: insErr } = await supabase
    .from("engagement_handoffs")
    .insert({
      project_id: projectId,
      agency_user_id: user.id,
      token,
      client_email: clientEmail,
      client_name:
        clientName || project.client_name?.trim() || null,
      agency_message: agencyMessage || null,
      opted_in_to_paid_vault: optedInToPaidVault,
    } as never)
    .select("id, expires_at")
    .single();
  if (insErr || !inserted) {
    return NextResponse.json(
      { error: "insert_failed", details: insErr?.message },
      { status: 500 },
    );
  }

  const expiresAt = new Date(
    (inserted as { expires_at: string }).expires_at,
  );
  const emailResult = await sendHandoffInviteEmail({
    to: clientEmail,
    shareUrl,
    agencyName: agency?.name?.trim() || "Your agency",
    agencyLogoUrl: agency?.logo_url ?? null,
    agencyPrimaryColor: agency?.primary_color || DEFAULT_PRIMARY_COLOR,
    agencyPartnerName: user.user_metadata?.full_name ?? "",
    agencyPartnerEmail: user.email ?? "",
    clientName:
      clientName || project.client_name?.trim() || null,
    engagementName: project.name,
    agencyMessage: agencyMessage || null,
    optedInToPaidVault,
    expiresAt,
  });

  if (emailResult.sent) {
    await supabase
      .from("engagement_handoffs")
      .update({ email_sent_at: new Date().toISOString() } as never)
      .eq("id", (inserted as { id: string }).id);
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "engagement_handoff_initiated",
    actor: "user",
    metadata: {
      handoff_id: (inserted as { id: string }).id,
      client_email: clientEmail,
      opted_in_to_paid_vault: optedInToPaidVault,
      email_sent: emailResult.sent,
    },
  } as never);

  return NextResponse.json(
    {
      id: (inserted as { id: string }).id,
      token,
      share_url: shareUrl,
      expires_at: (inserted as { expires_at: string }).expires_at,
      email_sent: emailResult.sent,
    },
    { status: 200 },
  );
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;

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

  // Find the in-flight handoff for this engagement.
  const { data: handoffRaw } = await supabase
    .from("engagement_handoffs")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("agency_user_id", user.id)
    .in("status", ["pending_acceptance", "pending_rekey"])
    .maybeSingle();
  if (!handoffRaw) {
    return NextResponse.json({ error: "no_in_flight" }, { status: 404 });
  }
  const handoff = handoffRaw as { id: string; status: string };

  const { error: upErr } = await supabase
    .from("engagement_handoffs")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    } as never)
    .eq("id", handoff.id);
  if (upErr) {
    return NextResponse.json(
      { error: "update_failed", details: upErr.message },
      { status: 500 },
    );
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "engagement_handoff_revoked",
    actor: "user",
    metadata: { handoff_id: handoff.id, prior_status: handoff.status },
  } as never);

  return NextResponse.json({ ok: true }, { status: 200 });
}
