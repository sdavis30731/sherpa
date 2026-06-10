/**
 * SHRP-097 — Dashboard claim endpoint.
 *
 * Called when the developer opens an approval's detail panel in the
 * dashboard. Sets notified_via='dashboard' + claimed_at on the row,
 * which suppresses the email-fallback cron from firing for it.
 *
 * No-op if:
 *   - the row is already claimed (notified_via IS NOT NULL)
 *   - the row is no longer pending (status != 'pending')
 *
 * Narrow surface: this endpoint can only write notified_via and
 * claimed_at, never the status, agent_prompt, result_*, etc. RLS is
 * scoped to auth.uid() = user_id (see policy from 0007), so a user
 * can only claim their own approvals.
 *
 * Returns: { claimed: true } if we set the columns, { claimed: false }
 * with a reason if not.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

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

  // Read first so we can be specific about why we no-op'd.
  const { data: row, error: readErr } = await supabase
    .from("pending_approvals")
    .select("id, status, notified_via")
    .eq("id", id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json(
      { error: "read_failed", details: readErr.message },
      { status: 500 },
    );
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json(
      { claimed: false, reason: "not_pending", status: row.status },
      { status: 200 },
    );
  }
  if (row.notified_via) {
    return NextResponse.json(
      { claimed: false, reason: "already_claimed", notified_via: row.notified_via },
      { status: 200 },
    );
  }

  // Race-tolerant claim — only set if the columns are still null. The
  // ".is('notified_via', null)" predicate guards against a fast email
  // cron that claimed first by milliseconds.
  const { error: upErr, count } = await supabase
    .from("pending_approvals")
    .update(
      {
        notified_via: "dashboard",
        claimed_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("status", "pending")
    .is("notified_via", null);
  if (upErr) {
    return NextResponse.json(
      { error: "claim_failed", details: upErr.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ claimed: (count ?? 0) > 0 }, { status: 200 });
}
