/**
 * POST /api/custody/[projectId]/issue
 *
 * SHRP-098 — flips a Custody Record from draft to issued. Sets
 * issued_at on projects.custody_assertions. Audit-logs the event.
 *
 * No payment is taken in v1 — Stripe metered billing is paused per
 * SHRP-054 until the LLC + ToS land. The IssueCustodyDialog explains
 * the founding cohort grace period. When Stripe lights up, this route
 * is the right place to gate the charge.
 *
 * Idempotent: a row that's already issued returns 200 with the
 * existing issued_at — no re-issue, no duplicate audit log.
 *
 * Rejects:
 *   - 401 not authenticated
 *   - 404 engagement not found (or not owned by user, via RLS)
 *   - 412 the record has never been saved (no saved_at) — issuing a
 *         document that doesn't exist yet would be incoherent
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeCustody, type CustodyAssertions } from "@/lib/custody";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;

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

  // RLS already scopes by user_id; maybeSingle returns null if the row
  // exists but the user doesn't own it.
  const { data: project, error: readErr } = await supabase
    .from("projects")
    .select("id, name, client_name, custody_assertions")
    .eq("id", projectId)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json(
      { error: "read_failed", details: readErr.message },
      { status: 500 },
    );
  }
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const custody: CustodyAssertions = normalizeCustody(
    project.custody_assertions as Record<string, unknown> | null,
  );

  // Already issued — idempotent return.
  if (custody.issued_at) {
    return NextResponse.json(
      {
        issued: true,
        issued_at: custody.issued_at,
        already_issued: true,
      },
      { status: 200 },
    );
  }

  // The agency has to save the draft at least once before issuing.
  // Otherwise we'd be stamping a document with no content.
  if (!custody.saved_at) {
    return NextResponse.json(
      {
        error: "not_drafted",
        message:
          "Save the Custody Record at least once before issuing it.",
      },
      { status: 412 },
    );
  }

  const issuedAt = new Date().toISOString();
  const next: CustodyAssertions = {
    ...custody,
    issued_at: issuedAt,
  };

  const { error: upErr } = await supabase
    .from("projects")
    .update({ custody_assertions: next })
    .eq("id", projectId);
  if (upErr) {
    return NextResponse.json(
      { error: "update_failed", details: upErr.message },
      { status: 500 },
    );
  }

  // Audit log — the lifecycle event we want surfaced on the timeline.
  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "custody_record_issued",
    actor: "user",
    metadata: {
      client_name: project.client_name,
      engagement_name: project.name,
      services_count: custody.services?.length ?? 0,
      // No billing has flowed yet; record the founding cohort grace.
      billing: "founding_cohort_grace",
    },
  });

  return NextResponse.json(
    { issued: true, issued_at: issuedAt },
    { status: 200 },
  );
}
