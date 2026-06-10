/**
 * GET /api/cron/approval-reminders
 *
 * Vercel cron sweep. Runs every minute (see vercel.json). Does two
 * passes over pending_approvals:
 *
 *   1. Initial notification (SHRP-097). pending + notified_via IS NULL
 *      + now() > notify_after — the dashboard hasn't claimed it within
 *      its 60s window, so we send the email and mark notified_via='email'.
 *
 *   2. 15-min reminder (SHRP-086). pending + reminder_sent_at IS NULL +
 *      expires_at within next 15 min — sends a reminder for approvals
 *      that the user hasn't acted on yet. Catches the "I saw the email,
 *      meant to look at it, got distracted" case.
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
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const authHeader = request.headers.get("authorization");
  if (!expectedAuth || authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_MS);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherpakeys.com";

  // ─────────────── Pass 1: initial notification (SHRP-097) ───────────────
  // Predicate covered by partial index pending_approvals_notify_pending_idx.
  const { data: initialData, error: initialErr } = await supabase
    .from("pending_approvals")
    .select(
      "id, user_id, action_summary, service, endpoint, method, dollar_amount_cents, agent_prompt, expires_at",
    )
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .is("notified_via", null)
    .lt("notify_after", nowIso);
  if (initialErr) {
    return NextResponse.json(
      { error: `initial query failed: ${initialErr.message}` },
      { status: 500 },
    );
  }
  const initialCandidates = (initialData ?? []) as ApprovalRow[];

  let initialSent = 0;
  let initialFailed = 0;
  const initialResults: Array<{ id: string; status: string; reason?: string }> = [];

  for (const row of initialCandidates) {
    const userResult = await supabase.auth.admin.getUserById(row.user_id);
    const toEmail = userResult.data.user?.email;
    if (!toEmail) {
      initialFailed++;
      initialResults.push({
        id: row.id,
        status: "skipped",
        reason: "no_email_for_user",
      });
      continue;
    }
    const approvalUrl = `${baseUrl.replace(/\/+$/, "")}/approve/${row.id}`;

    // Race-tolerant claim — only send if notified_via is still null. If
    // the dashboard claimed in the last few hundred ms, we skip.
    const { error: claimErr, count } = await supabase
      .from("pending_approvals")
      .update(
        {
          notified_via: "email",
          claimed_at: nowIso,
        } as never,
        { count: "exact" },
      )
      .eq("id", row.id)
      .eq("status", "pending")
      .is("notified_via", null);
    if (claimErr || (count ?? 0) === 0) {
      initialResults.push({
        id: row.id,
        status: "skipped",
        reason: claimErr ? claimErr.message : "lost_race_to_dashboard",
      });
      continue;
    }

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
    });

    if (result.sent) {
      initialSent++;
      initialResults.push({ id: row.id, status: "notified" });
    } else {
      // Email send failed. Roll back the claim so a later sweep can
      // retry. If we don't, the row stays "notified_via=email" but no
      // email actually arrived — the user is unreachable until expiry.
      await supabase
        .from("pending_approvals")
        .update({ notified_via: null, claimed_at: null } as never)
        .eq("id", row.id);
      initialFailed++;
      initialResults.push({
        id: row.id,
        status: "email_failed",
        reason: result.reason,
      });
    }
  }

  // ─────────────── Pass 2: 15-min reminder (SHRP-086) ───────────────
  const { data: reminderData, error: reminderErr } = await supabase
    .from("pending_approvals")
    .select(
      "id, user_id, action_summary, service, endpoint, method, dollar_amount_cents, agent_prompt, expires_at",
    )
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .lt("expires_at", reminderCutoff.toISOString())
    .is("reminder_sent_at", null);
  if (reminderErr) {
    return NextResponse.json(
      { error: `reminder query failed: ${reminderErr.message}` },
      { status: 500 },
    );
  }
  const reminderCandidates = (reminderData ?? []) as ApprovalRow[];

  let reminderSent = 0;
  let reminderFailed = 0;
  const reminderResults: Array<{ id: string; status: string; reason?: string }> = [];

  for (const row of reminderCandidates) {
    const userResult = await supabase.auth.admin.getUserById(row.user_id);
    const toEmail = userResult.data.user?.email;
    if (!toEmail) {
      reminderFailed++;
      reminderResults.push({
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
        .update({ reminder_sent_at: nowIso } as never)
        .eq("id", row.id);
      if (updateErr) {
        reminderFailed++;
        reminderResults.push({
          id: row.id,
          status: "sent_but_not_marked",
          reason: updateErr.message,
        });
      } else {
        reminderSent++;
        reminderResults.push({ id: row.id, status: "reminded" });
      }
    } else {
      reminderFailed++;
      reminderResults.push({
        id: row.id,
        status: "email_failed",
        reason: result.reason,
      });
    }
  }

  return NextResponse.json({
    swept_at: nowIso,
    initial: {
      candidate_count: initialCandidates.length,
      sent: initialSent,
      failed: initialFailed,
      results: initialResults,
    },
    reminder: {
      candidate_count: reminderCandidates.length,
      sent: reminderSent,
      failed: reminderFailed,
      results: reminderResults,
    },
  });
}
