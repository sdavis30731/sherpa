/**
 * POST /api/client-onboard/[token]/complete
 *
 * SHRP-107 — Client signals "I'm done." Marks
 * credential_requests.submitted_at and records the experience-level
 * choice if it wasn't recorded earlier. Triggers agency-side
 * notifications (Realtime fires on credential_submissions inserts;
 * the agency dashboard separately polls credential_requests too).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PostBody {
  experience_level?: unknown;
}

const VALID_LEVELS = new Set(["beginner", "intermediate", "expert"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  let body: PostBody = {};
  try {
    body = (await req.json().catch(() => ({}))) as PostBody;
  } catch {
    body = {};
  }
  const expLevel =
    typeof body.experience_level === "string" &&
    VALID_LEVELS.has(body.experience_level)
      ? body.experience_level
      : null;

  const admin = createAdminClient();

  const { data: requestRow, error: reqErr } = await admin
    .from("credential_requests")
    .select(
      "id, user_id, project_id, expires_at, revoked_at, submitted_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (reqErr) {
    return NextResponse.json(
      { error: "lookup_failed", details: reqErr.message },
      { status: 500 },
    );
  }
  if (!requestRow) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const r = requestRow as {
    id: string;
    user_id: string;
    project_id: string;
    expires_at: string;
    revoked_at: string | null;
    submitted_at: string | null;
  };
  if (r.revoked_at) {
    return NextResponse.json({ error: "request_revoked" }, { status: 410 });
  }
  if (r.submitted_at) {
    return NextResponse.json(
      { error: "already_submitted", submitted_at: r.submitted_at },
      { status: 200 },
    );
  }
  if (new Date(r.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "request_expired" }, { status: 410 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { submitted_at: now };
  if (expLevel) patch.experience_level = expLevel;

  const { error: upErr } = await admin
    .from("credential_requests")
    .update(patch as never)
    .eq("id", r.id);
  if (upErr) {
    return NextResponse.json(
      { error: "update_failed", details: upErr.message },
      { status: 500 },
    );
  }

  // Audit log — the agency-facing timeline gets "Client submitted
  // credentials". This logs against the agency owner so RLS shows it
  // in their activity view.
  await admin.from("audit_log").insert({
    user_id: r.user_id,
    project_id: r.project_id,
    action: "credential_request_submitted",
    actor: "client",
    metadata: { request_id: r.id, experience_level: expLevel },
  } as never);

  return NextResponse.json({ submitted_at: now }, { status: 200 });
}
