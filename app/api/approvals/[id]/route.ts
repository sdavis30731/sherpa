/**
 * GET /api/approvals/[id]
 *
 * Fetch a pending approval (or its terminal state) for the approval UI.
 * RLS scopes to the calling user.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ApprovalRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  service: string;
  endpoint: string;
  method: string;
  params: unknown;
  action_summary: string;
  dollar_amount_cents: number | null;
  agent_prompt: string | null;
  expires_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  result_status_code: number | null;
  result_body: string | null;
  executed_at: string | null;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("pending_approvals")
    .select(
      "id, status, service, endpoint, method, params, action_summary, dollar_amount_cents, agent_prompt, expires_at, approved_at, rejected_at, created_at, result_status_code, result_body, executed_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data as ApprovalRow);
}
