/**
 * POST /api/approvals/[id]/approve  (SHRP-042 Stage 2 + SHRP-042-bug fix)
 *
 * The user clicked "Approve" on /approve/[id]. The order of operations is
 * deliberate: we verify EVERY precondition (agent session live, credential
 * present in the session, decryption actually succeeds) BEFORE we mark the
 * approval as approved. That way a failed precondition leaves the row in
 * 'pending' state, so the user can fix the problem (e.g. re-authorize
 * agents) and click Approve again — instead of being stuck with a row that
 * says 'approved' but never executed.
 *
 *   1. Verify caller.
 *   2. Load approval, check ownership + status + TTL.
 *   3. Load the credential and verify it belongs to this project.
 *   4. Find the active agent session for this project.
 *   5. Find the session-encrypted version of this specific credential.
 *   6. Actually decrypt it (fail fast if the crypto can't be done).
 *   7. **NOW** atomically claim the row (status='approved'). Concurrent
 *      clicks lose the eq("status","pending") race and get a clean 409.
 *   8. Make the upstream API call with the already-decrypted credential.
 *   9. Persist the result onto the row (result_status_code/body/executed_at)
 *      and audit-log everything.
 *
 * The agent fetches the result later via sherpa_get_approval_result.
 *
 * NOTE: The credential-decrypt-and-call logic here mirrors tool_callApi in
 * app/api/mcp/v1/route.ts. A future refactor (SHRP-042 follow-up) should
 * extract a shared executor — for now we duplicate to keep the MCP server's
 * critical path stable.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  unwrapSessionKey,
  decryptWithSessionKey,
} from "@/lib/agent-session";
import { getProvider } from "@/lib/providers";

const RESERVED_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "host",
  "content-length",
]);

interface PendingApprovalRow {
  id: string;
  user_id: string;
  token_id: string;
  project_id: string;
  service: string;
  endpoint: string;
  method: string;
  params: Record<string, unknown> | null;
  action_summary: string;
  dollar_amount_cents: number | null;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string;
}

interface AgentSessionRow {
  id: string;
  wrapper_ciphertext: string;
  expires_at: string;
  revoked_at: string | null;
}

interface SessionCredRow {
  session_ciphertext: string;
}

interface CredentialRow {
  id: string;
  project_id: string;
  service: string;
  env: string;
  label: string;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // ============================================================
  // 1) Verify caller
  // ============================================================
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Use admin client for the rest so we can read credentials / sessions
  // tables that the user-scoped client doesn't have direct access to. We
  // gate every step on user_id matching auth.uid().
  const supabase = createAdminClient();

  // ============================================================
  // 2) Load approval, check ownership + status + TTL
  // ============================================================
  const { data: approvalData } = await supabase
    .from("pending_approvals")
    .select(
      "id, user_id, token_id, project_id, service, endpoint, method, params, action_summary, dollar_amount_cents, status, expires_at",
    )
    .eq("id", id)
    .maybeSingle();

  const approval = approvalData as PendingApprovalRow | null;
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
  if (new Date(approval.expires_at).getTime() < Date.now()) {
    // Mark it expired so this state is sticky.
    await supabase
      .from("pending_approvals")
      .update({ status: "expired" } as never)
      .eq("id", id);
    return NextResponse.json(
      { error: "This approval has expired" },
      { status: 410 },
    );
  }

  // ============================================================
  // 3) Load the credential and verify it belongs to this project
  // (BEFORE atomic claim — we don't want to mark approved if we can't
  //  even find the credential)
  // ============================================================
  const credentialId =
    typeof approval.params === "object" && approval.params !== null
      ? (approval.params as { credential_id?: string }).credential_id
      : undefined;
  if (!credentialId) {
    return NextResponse.json(
      { error: "Approval is missing a credential reference" },
      { status: 500 },
    );
  }
  const { data: credentialData } = await supabase
    .from("credentials")
    .select("id, project_id, service, env, label")
    .eq("id", credentialId)
    .is("deleted_at", null)
    .maybeSingle();
  const credential = credentialData as CredentialRow | null;
  if (!credential) {
    return NextResponse.json(
      { error: "Credential not found" },
      { status: 404 },
    );
  }
  if (credential.project_id !== approval.project_id) {
    return NextResponse.json(
      { error: "Credential does not belong to this project" },
      { status: 403 },
    );
  }

  const provider = getProvider(credential.service);
  if (!provider) {
    return NextResponse.json(
      { error: `Service '${credential.service}' is not supported` },
      { status: 500 },
    );
  }

  // ============================================================
  // 4) Find the active agent session
  // (BEFORE atomic claim — if no session, the row stays 'pending' so
  //  the user can re-authorize agents and click Approve again)
  // ============================================================
  const { data: sessionData } = await supabase
    .from("agent_sessions")
    .select("id, wrapper_ciphertext, expires_at, revoked_at")
    .eq("project_id", approval.project_id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("authorized_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agentSession = sessionData as AgentSessionRow | null;
  if (!agentSession) {
    return NextResponse.json(
      {
        error:
          "No active agent session. Re-authorize agents in project settings, then click Approve again.",
        recovery: "reauthorize_agents",
      },
      { status: 409 },
    );
  }

  // ============================================================
  // 5) Find the session-encrypted credential
  // (BEFORE atomic claim — same reason)
  // ============================================================
  const { data: sessionCredData } = await supabase
    .from("agent_session_credentials")
    .select("session_ciphertext")
    .eq("session_id", agentSession.id)
    .eq("credential_id", credentialId)
    .maybeSingle();
  const sessionCred = sessionCredData as SessionCredRow | null;
  if (!sessionCred) {
    return NextResponse.json(
      {
        error:
          "This credential is not part of the current agent session. Re-authorize agents and include it, then click Approve again.",
        recovery: "reauthorize_agents",
      },
      { status: 409 },
    );
  }

  // ============================================================
  // 6) Actually decrypt
  // (BEFORE atomic claim — if the crypto fails, we leave row pending)
  // ============================================================
  let plaintextCredential: string;
  try {
    const sessionKey = await unwrapSessionKey(agentSession.wrapper_ciphertext);
    plaintextCredential = await decryptWithSessionKey(
      sessionCred.session_ciphertext,
      sessionKey,
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: `Decryption failed: ${err instanceof Error ? err.message : "unknown"}. The row was not marked approved — the agent session may be corrupt; re-authorize agents and try again.`,
      },
      { status: 500 },
    );
  }

  // ============================================================
  // 7) NOW atomically claim the row
  // Every precondition above has passed. The eq("status","pending")
  // gives us race-safety for concurrent clicks.
  // ============================================================
  const { data: claimed, error: claimErr } = await supabase
    .from("pending_approvals")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimErr || !claimed) {
    return NextResponse.json(
      { error: "Approval was already resolved by a concurrent click" },
      { status: 409 },
    );
  }

  // ============================================================
  // 8) Build and dispatch the upstream call
  // ============================================================
  const path =
    typeof approval.params === "object" && approval.params !== null
      ? ((approval.params as { path?: string }).path ?? "/")
      : "/";
  const url = provider.baseUrl + path;
  const authHeaders = provider.buildAuthHeaders(plaintextCredential);

  const outboundHeaders: Record<string, string> = {
    "User-Agent": "SherpaKeys-MCP/0.1",
  };
  const extra =
    typeof approval.params === "object" && approval.params !== null
      ? (approval.params as { extra_headers?: Record<string, string> })
          .extra_headers
      : undefined;
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (RESERVED_HEADERS.has(k.toLowerCase())) continue;
      outboundHeaders[k] = String(v);
    }
  }
  for (const [k, v] of Object.entries(authHeaders)) {
    outboundHeaders[k] = v;
  }

  let outboundBody: string | undefined;
  const requestBody =
    typeof approval.params === "object" && approval.params !== null
      ? (approval.params as { body?: unknown }).body
      : undefined;
  if (
    requestBody !== undefined &&
    requestBody !== null &&
    approval.method.toUpperCase() !== "GET"
  ) {
    if (typeof requestBody === "string") {
      outboundBody = requestBody;
    } else {
      outboundBody = JSON.stringify(requestBody);
      outboundHeaders["Content-Type"] ??= "application/json";
    }
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(url, {
      method: approval.method.toUpperCase(),
      headers: outboundHeaders,
      body: outboundBody,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    // Persist the failure so the agent can see what happened — note the
    // row is already marked 'approved' at this point, so this is a real
    // approved-but-execution-failed state, which IS legitimate (network
    // glitch, upstream service down, etc.) and should be visible.
    await supabase
      .from("pending_approvals")
      .update({
        result_status_code: 0,
        result_body: `Network error: ${reason}`,
        executed_at: new Date().toISOString(),
      } as never)
      .eq("id", id);
    return NextResponse.json(
      { error: `Outbound request failed: ${reason}` },
      { status: 502 },
    );
  }

  const responseText = await providerResponse.text();

  // ============================================================
  // 9) Persist the result + audit log
  // ============================================================
  await supabase
    .from("pending_approvals")
    .update({
      result_status_code: providerResponse.status,
      result_body: responseText,
      executed_at: new Date().toISOString(),
    } as never)
    .eq("id", id);

  await supabase.from("audit_log").insert({
    user_id: approval.user_id,
    project_id: approval.project_id,
    credential_id: credentialId,
    action: "agent_write_approved_and_executed",
    actor: "user",
    metadata: {
      approval_id: approval.id,
      token_id: approval.token_id,
      service: approval.service,
      method: approval.method,
      endpoint: approval.endpoint,
      summary: approval.action_summary,
      result_status: providerResponse.status,
    },
  } as never);

  return NextResponse.json({
    success: true,
    result_status_code: providerResponse.status,
    executed_at: new Date().toISOString(),
  });
}
