import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApprovalsBoard } from "./_components/approvals-board";
import { Breadcrumb } from "@/components/ui/breadcrumb";

/**
 * SHRP-097 — Approvals dashboard.
 *
 * Server component does the initial pull: pending approvals (status
 * = 'pending' AND expires_at > now()), plus the most recent 25 rows
 * regardless of status for context. RLS scopes everything to the
 * current user.
 *
 * Hands the rows + the user id to ApprovalsBoard, which subscribes
 * to Supabase Realtime for live updates. The board is the whole
 * interactive surface — list left, detail right (or stacked on
 * mobile).
 */
export type ApprovalListRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  service: string;
  endpoint: string;
  method: string;
  action_summary: string;
  dollar_amount_cents: number | null;
  agent_prompt: string | null;
  params: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  notified_via: "dashboard" | "email" | null;
  claimed_at: string | null;
  notify_after: string;
  project_id: string;
};

const RECENT_LIMIT = 25;

export default async function ApprovalsDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vault/approvals");

  // Pending — strict filter on status + non-expired. RLS already
  // restricts to user_id = auth.uid().
  const nowIso = new Date().toISOString();
  const { data: pending } = await supabase
    .from("pending_approvals")
    .select(
      "id, status, service, endpoint, method, action_summary, dollar_amount_cents, agent_prompt, params, expires_at, created_at, approved_at, rejected_at, notified_via, claimed_at, notify_after, project_id",
    )
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  const { data: recent } = await supabase
    .from("pending_approvals")
    .select(
      "id, status, service, endpoint, method, action_summary, dollar_amount_cents, agent_prompt, params, expires_at, created_at, approved_at, rejected_at, notified_via, claimed_at, notify_after, project_id",
    )
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  const { data: agencyRow } = await supabase
    .from("agency_profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  const agencyName =
    (agencyRow as { name?: string | null } | null)?.name?.trim() ||
    "Your agency";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumb
        className="mb-3"
        segments={[
          { label: agencyName, href: "/vault" },
          { label: "Approvals" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Agent actions you need to approve
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          When an AI agent tries to write through SherpaKeys, the request
          lands here. New requests appear instantly while you&apos;re on this
          page — email is the away-from-desk fallback.
        </p>
      </div>
      <ApprovalsBoard
        userId={user.id}
        initialPending={(pending ?? []) as ApprovalListRow[]}
        initialRecent={(recent ?? []) as ApprovalListRow[]}
      />
    </main>
  );
}
