/**
 * POST /api/approvals/[id]/reject  (SHRP-042 Stage 2)
 *
 * The user clicked "Reject" on /approve/[id]. We mark the row as
 * 'rejected' and audit-log. The MCP server's sherpa_get_approval_result
 * tool will then return the rejected status to the agent the next time
 * it asks.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PendingApprovalRow {
  id: string;
  user_id: string;
  token_id: string;
  project_id: string;
  service: string;
  endpoint: string;
  method: string;
  action_summary: string;
  status: "pending" | "approved" | "rejected" | "expired";
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("pending_approvals")
    .select(
      "id, user_id, token_id, project_id, service, endpoint, method, action_summary, status",
    )
    .eq("id", id)
    .maybeSingle();
  const approval = data as PendingApprovalRow | null;
  if (!approval) {
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  }
  if (approval.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (approval.status !== "pending") {
    return NextResponse.json(
      { error: `This approval is already ${approval.status}` },
      { status: 409 },
    );
  }

  const { data: claimed } = await supabase
    .from("pending_approvals")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    return NextResponse.json(
      { error: "Approval was already resolved" },
      { status: 409 },
    );
  }

  await supabase.from("audit_log").insert({
    user_id: approval.user_id,
    project_id: approval.project_id,
    action: "agent_write_rejected",
    actor: "user",
    metadata: {
      approval_id: approval.id,
      token_id: approval.token_id,
      service: approval.service,
      method: approval.method,
      endpoint: approval.endpoint,
      summary: approval.action_summary,
    },
  } as never);

  return NextResponse.json({ success: true });
}
