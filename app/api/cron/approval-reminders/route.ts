/**
 * GET /api/cron/approval-reminders  (SHRP-086)
 *
 * Vercel cron sweep. Runs every 5 minutes (see vercel.json). Finds
 * pending_approvals rows that are still 'pending', that haven't been
 * reminded yet, and whose expires_at is within the next 15 minutes —
 * then sends a reminder email and marks reminder_sent_at.
 *
 * The original approval email might have been buried (Gmail's Important
 * folder, spam, the user simply not at their desk). A reminder 15 min
 * before expiry catches the cases where the human just hasn't seen it
 * yet. Without this, the most common failure mode is "the agent did
 * exactly what we told it to and the user didn't notice until it was
 * too late" — which killed Fable's first /agencies commit attempt.
 *
 * Auth: Vercel cron jobs automatically include
 *   Authorization: Bearer <CRON_SECRET>
 * if the CRON_SECRET env var is configured. We verify that header and
 * reject everything else. The endpoint is otherwise unauthenticated —
 * NEVER expose its work via a publicly-accessible path.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApprovalEmail } from "@/lib/email";

const REMINDER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes before expiry

interface ApprovalRow {
  id: string;
  user_id: string;
  action_summary: string;
  service: string;
  endpoint: string;
  method: string;
  dollar_amount_cents: number | null;
  agent_prompt: string | null;
  expires_at: string;
}

export async function GET(request: NextRequest) {
  // Auth — Vercel cron sends Bearer <CRON_SECRET>. If CRON_SECRET isn't
  // configured, refuse to run; we don't want a no-auth cron loose.
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const authHeader = request.headers.get("authorization");
  if (!expectedAuth || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const { data: candidatesData, error: queryErr } = await supabase
    .from("pending_approvals")
    .select(
      "id, user_id, action_summary, service, endpoint, method, dollar_amount_cents, agent_prompt, expires_at",
    )
    .eq("status", "pending")
    .gt("expires_at", now.toISOString())
    .lt("expires_at", reminderCutoff.toISOString())
    .is("reminder_sent_at", null);

  if (queryErr) {
    return NextResponse.json(
      { error: `query failed: ${queryErr.message}` },
      { status: 500 },
    );
  }

  const candidates = (candidatesData ?? []) as ApprovalRow[];
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpakeys.com";

  let sent = 0;
  let failed = 0;
  const results: Array<{ id: string; status: string; reason?: string }> = [];

  for (const row of candidates) {
    const userResult = await supabase.auth.admin.getUserById(row.user_id);
    const toEmail = userResult.data.user?.email;
    if (!toEmail) {
      failed++;
      results.push({
        id: row.id,
        status: "skipped",
        reason: "no_email_for_user",
      });
      continue;
    }

    const approvalUrl = `${baseUrl.replace(/\/+$/, "")}/approve/${row.id}`;

    const result = await sendApprovalEmail({
      to: toEmail,
      approvalUrl,
      summary: row.action_summary,
      service: row.service,
      endpoint: row.endpoint,
      method: row.method,
      dollarAmountCents: row.dollar_amount_cents,
      expiresAt: new Date(row.expires_at),
      agentPrompt: row.agent_prompt,
      isReminder: true,
    });

    if (result.sent) {
      const { error: updateErr } = await supabase
        .from("pending_approvals")
        .update({ reminder_sent_at: now.toISOString() } as never)
        .eq("id", row.id);
      if (updateErr) {
        // Email was sent but we couldn't mark it — log and move on. Worst
        // case the next sweep sends a duplicate; that's acceptable.
        failed++;
        results.push({
          id: row.id,
          status: "sent_but_not_marked",
          reason: updateErr.message,
        });
      } else {
        sent++;
        results.push({ id: row.id, status: "reminded" });
      }
    } else {
      failed++;
      results.push({
        id: row.id,
        status: "email_failed",
        reason: result.reason,
      });
    }
  }

  return NextResponse.json({
    swept_at: now.toISOString(),
    candidate_count: candidates.length,
    sent,
    failed,
    results,
  });
}
