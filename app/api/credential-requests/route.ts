/**
 * POST /api/credential-requests
 *
 * SHRP-107 — Agency-side endpoint to create a "Request credentials"
 * invitation for a client. Generates a signed magic-link token, inserts
 * a credential_requests row, and (eventually, SHRP-107e) emails the
 * client via Resend.
 *
 * Body:
 *   {
 *     project_id: string (uuid),
 *     client_email: string,
 *     client_name?: string,
 *     client_message?: string,
 *     requested_services: string[]   // service ids from lib/services.ts
 *   }
 *
 * Returns 200 with { id, token, share_url } on success.
 *
 * Auth: standard cookie session, RLS enforces project ownership.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SERVICES, getService } from "@/lib/services";
import { sendCredentialRequestEmail } from "@/lib/email";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/agency";

const VALID_SERVICE_IDS = new Set(SERVICES.map((s) => s.id));

/** 32 bytes random → URL-safe base64. ~43 chars, ~256 bits of entropy. */
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
  project_id?: unknown;
  client_email?: unknown;
  client_name?: unknown;
  client_message?: unknown;
  requested_services?: unknown;
}

export async function POST(req: Request) {
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
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  // ─── Validate ────────────────────────────────────────────────
  const projectId = typeof body.project_id === "string" ? body.project_id : null;
  const clientEmail =
    typeof body.client_email === "string" ? body.client_email.trim() : "";
  const clientName =
    typeof body.client_name === "string" ? body.client_name.trim() : "";
  const clientMessage =
    typeof body.client_message === "string"
      ? body.client_message.trim()
      : "";
  const requestedServicesRaw = Array.isArray(body.requested_services)
    ? body.requested_services
    : [];

  if (!projectId) {
    return NextResponse.json(
      { error: "missing_project_id" },
      { status: 400 },
    );
  }
  if (!clientEmail || !/.+@.+\..+/.test(clientEmail)) {
    return NextResponse.json(
      { error: "invalid_client_email" },
      { status: 400 },
    );
  }
  const requestedServices = requestedServicesRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.toLowerCase())
    .filter((s) => VALID_SERVICE_IDS.has(s));
  if (requestedServices.length === 0) {
    return NextResponse.json(
      { error: "no_valid_services_selected" },
      { status: 400 },
    );
  }

  // ─── Verify ownership of the engagement (RLS belt + suspenders) ─
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, name, client_name")
    .eq("id", projectId)
    .maybeSingle();
  if (projErr) {
    return NextResponse.json(
      { error: "project_lookup_failed", details: projErr.message },
      { status: 500 },
    );
  }
  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // ─── Insert the request ─────────────────────────────────────
  const token = generateToken();
  const engagementLabel = (project as { name: string }).name;
  const effectiveClientName =
    clientName || (project as { client_name?: string | null }).client_name?.trim() || "";

  const { data: inserted, error: insErr } = await supabase
    .from("credential_requests")
    .insert({
      user_id: user.id,
      project_id: projectId,
      token,
      requested_services: requestedServices,
      client_email: clientEmail,
      client_name: effectiveClientName || null,
      client_message: clientMessage || null,
      engagement_label: engagementLabel,
    } as never)
    .select("id, token, created_at, expires_at")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      {
        error: "insert_failed",
        details: insErr?.message ?? "no row returned",
      },
      { status: 500 },
    );
  }

  // Pull the agency profile (branding) + partner identity for the email.
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

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpakeys.com";
  const shareUrl = `${baseUrl.replace(/\/+$/, "")}/client-onboard/${token}`;

  // Send the invite email. Graceful if Resend isn't configured — the
  // agency can still copy the share URL from the dialog and send it
  // manually.
  const requestedServiceNames = requestedServices.map((id) => {
    const svc = getService(id);
    return svc?.name ?? id;
  });
  const expiresAt = new Date(
    (inserted as { expires_at: string }).expires_at,
  );

  const emailResult = await sendCredentialRequestEmail({
    to: clientEmail,
    shareUrl,
    agencyName: agency?.name?.trim() || "Your agency",
    agencyLogoUrl: agency?.logo_url ?? null,
    agencyPrimaryColor: agency?.primary_color || DEFAULT_PRIMARY_COLOR,
    agencyPartnerName: user.user_metadata?.full_name ?? "",
    agencyPartnerEmail: user.email ?? "",
    clientName: effectiveClientName || null,
    engagementName: engagementLabel,
    personalMessage: clientMessage || null,
    requestedServiceNames,
    expiresAt,
  });

  if (emailResult.sent) {
    await supabase
      .from("credential_requests")
      .update({ email_sent_at: new Date().toISOString() } as never)
      .eq("id", (inserted as { id: string }).id);
  }

  // Audit-log the request.
  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "credential_request_created",
    actor: "user",
    metadata: {
      request_id: (inserted as { id: string }).id,
      client_email: clientEmail,
      services_count: requestedServices.length,
      services: requestedServices,
      email_sent: emailResult.sent,
      email_reason: emailResult.reason,
    },
  });

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
