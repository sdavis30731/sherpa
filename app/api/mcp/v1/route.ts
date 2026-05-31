/**
 * Sherpa MCP server — SHRP-030 (scaffold) + SHRP-031 (sherpa_list_services)
 *
 * Speaks the Model Context Protocol over HTTP (JSON-RPC 2.0).
 *
 * Auth: each request must have an `Authorization: Bearer shrp_…` header.
 * The token is SHA-256 hashed and looked up in mcp_tokens. If the row
 * exists and is not revoked, the request is authenticated and scoped to
 * the token's project_id.
 *
 * Methods supported in this slice:
 *   - initialize        Protocol handshake.
 *   - tools/list        Returns the catalog of tools this server exposes.
 *   - tools/call        Dispatches to a tool implementation. Currently only
 *                       `sherpa_list_services` is implemented.
 *
 * Methods coming in the next slice:
 *   - sherpa_call_api   (SHRP-032, needs key sealing SHRP-040)
 *   - sherpa_rotate     (SHRP-033, P1)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getService } from "@/lib/services";
import { evaluateRotation } from "@/lib/rotation";
import { getProvider } from "@/lib/providers";
import {
  unwrapSessionKey,
  decryptWithSessionKey,
} from "@/lib/agent-session";
import { getPlaybook } from "@/lib/playbooks";
import { getService as getServiceMeta } from "@/lib/services";
import { checkRateLimit, recordRateLimitEvent } from "@/lib/rate-limit";

// ---- protocol constants ----

const SUPPORTED_PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "sherpa",
  version: "0.1.0",
} as const;

const TOOLS = [
  {
    name: "sherpa_list_services",
    description:
      "List the services that have credentials stored in this Sherpa project. Returns metadata only — no secret values. The agent never sees the keys themselves.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "sherpa_rotate",
    description:
      "Returns ordered, plain-language steps for rotating a specific credential, plus a direct dashboard URL and a Sherpa deep-link the user can click. Does NOT execute the rotation automatically — the user (or, in a future version, the Sherpa Rotation Pack) does the actual rotation. Use this when the user asks how to rotate something, or when a credential is overdue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        credential_id: {
          type: "string",
          description:
            "The Sherpa credential ID to get rotation steps for, as returned by sherpa_list_services.",
        },
      },
      required: ["credential_id"],
    },
  },
  {
    name: "sherpa_call_api",
    description:
      "Call a third-party API on the user's behalf. Sherpa server-side injects the credential into the outbound request; the agent never sees the secret value. Requires an active agent authorization session (the user explicitly authorizes agent access from the Sherpa UI for a time window). Available services: stripe, github, openai, anthropic, resend, cloudflare, replicate.",
    inputSchema: {
      type: "object" as const,
      properties: {
        credential_id: {
          type: "string",
          description:
            "The Sherpa credential ID to use, as returned by sherpa_list_services.",
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          description: "HTTP method.",
        },
        path: {
          type: "string",
          description:
            "Path appended to the provider base URL. Must start with '/'. Example: '/v1/charges?limit=1'.",
        },
        body: {
          description:
            "Optional request body. An object will be sent as JSON; a string is sent as the raw body. Omit for GET requests.",
        },
        extra_headers: {
          type: "object",
          description:
            "Optional additional headers (e.g. Idempotency-Key). Auth headers are injected by Sherpa and cannot be overridden.",
        },
      },
      required: ["credential_id", "method", "path"],
    },
  },
] as const;

// ---- JSON-RPC plumbing ----

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

function success(id: string | number | null | undefined, result: unknown): JsonRpcSuccess {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function fail(
  id: string | number | null | undefined,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data } };
}

// Standard JSON-RPC error codes
const E_PARSE = -32700;
const E_INVALID_REQUEST = -32600;
const E_METHOD_NOT_FOUND = -32601;
const E_INVALID_PARAMS = -32602;
const E_INTERNAL = -32603;

// ---- auth ----

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface AuthedSession {
  tokenId: string;
  userId: string;
  projectId: string;
  scopes: string[];
}

interface McpTokenRow {
  id: string;
  user_id: string;
  project_id: string;
  scopes: string[];
  revoked_at: string | null;
}

async function authenticate(request: NextRequest): Promise<AuthedSession | null> {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("mcp_tokens")
    .select("id, user_id, project_id, scopes, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const row = data as McpTokenRow | null;
  if (!row || row.revoked_at) return null;

  // Fire-and-forget update of last_used_at — don't slow down the request.
  // We use `as never` because the admin client has no Database<>) types
  // generated, so the update payload type is unresolvable. The actual
  // query is fine at runtime.
  void supabase
    .from("mcp_tokens")
    .update({ last_used_at: new Date().toISOString() } as never)
    .eq("id", row.id);

  return {
    tokenId: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    scopes: row.scopes ?? [],
  };
}

function hasScope(session: AuthedSession, scope: string): boolean {
  return session.scopes.includes(scope);
}

// ---- method dispatch ----

async function handleInitialize(
  req: JsonRpcRequest,
  _session: AuthedSession,
): Promise<JsonRpcSuccess | JsonRpcError> {
  // Echo back the client's requested protocol version if we support it,
  // otherwise return our latest supported version.
  const params = (req.params ?? {}) as { protocolVersion?: string };
  const clientVersion = typeof params.protocolVersion === "string" ? params.protocolVersion : null;

  return success(req.id, {
    protocolVersion: clientVersion ?? SUPPORTED_PROTOCOL_VERSION,
    capabilities: {
      tools: { listChanged: false },
    },
    serverInfo: SERVER_INFO,
  });
}

async function handleToolsList(req: JsonRpcRequest): Promise<JsonRpcSuccess | JsonRpcError> {
  return success(req.id, { tools: TOOLS });
}

async function handleToolsCall(
  req: JsonRpcRequest,
  session: AuthedSession,
): Promise<JsonRpcSuccess | JsonRpcError> {
  const params = (req.params ?? {}) as { name?: string; arguments?: unknown };
  if (!params.name) {
    return fail(req.id, E_INVALID_PARAMS, "Missing tool name");
  }

  switch (params.name) {
    case "sherpa_list_services":
      return tool_listServices(req, session);
    case "sherpa_rotate":
      return tool_rotate(req, session, params.arguments);
    case "sherpa_call_api":
      return tool_callApi(req, session, params.arguments);
    default:
      return fail(req.id, E_METHOD_NOT_FOUND, `Unknown tool: ${params.name}`);
  }
}

// ---- tool implementations ----

async function tool_listServices(
  req: JsonRpcRequest,
  session: AuthedSession,
): Promise<JsonRpcSuccess | JsonRpcError> {
  if (!hasScope(session, "read-credential-names")) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "Token does not have the 'read-credential-names' scope",
    );
  }

  interface CredentialRow {
    id: string;
    service: string;
    env: string;
    label: string;
    last_rotated_at: string | null;
    created_at: string;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("credentials")
    .select("id, service, env, label, last_rotated_at, created_at")
    .eq("project_id", session.projectId)
    .is("deleted_at", null)
    .order("service");

  if (error) {
    return fail(req.id, E_INTERNAL, error.message);
  }

  const credentials = (data ?? []) as CredentialRow[];

  const items = credentials.map((c) => {
    const service = getService(c.service);
    const interval = service?.rotationDays ?? 180;
    const rotation = evaluateRotation(c.last_rotated_at, interval, c.created_at);
    return {
      id: c.id,
      service: c.service,
      service_name: service?.name ?? c.service,
      env: c.env,
      label: c.label,
      last_rotated_at: c.last_rotated_at,
      rotation_status: rotation.status,
      days_overdue: rotation.daysOverdue,
    };
  });

  // MCP tools return a CallToolResult, which carries a `content` array of
  // text/image/resource blocks. We use a single text block carrying the
  // JSON-encoded list so non-MCP-aware clients (or human debuggers) can
  // still read the output, and also a `structuredContent` field for
  // agents that prefer machine-parseable output.
  return success(req.id, {
    content: [
      {
        type: "text",
        text: JSON.stringify(items, null, 2),
      },
    ],
    structuredContent: { services: items },
  });
}

// ---- sherpa_rotate ----

interface RotateArgs {
  credential_id?: string;
}

/**
 * Detects the key type from a credential's label.
 *
 * Sherpa stores credentials with a label of the form
 * "<user label> · <KeyType.label>", with the key-type slug only available
 * indirectly (we look it up in the services catalog). This helper finds the
 * matching key-type id by reading off the suffix.
 *
 * If we can't determine the key type, we return null and the rotate tool
 * falls back to the first rotation guide for the service. Worth replacing
 * with a structured key_type column on credentials (a small refactor on
 * the backlog).
 */
function inferKeyTypeFromLabel(serviceId: string, label: string): string | null {
  const svc = getServiceMeta(serviceId);
  if (!svc) return null;
  const suffix = label.split(" · ").pop()?.trim();
  if (!suffix) return null;
  const match = svc.keyTypes.find((kt) => kt.label === suffix);
  return match?.id ?? null;
}

async function tool_rotate(
  req: JsonRpcRequest,
  session: AuthedSession,
  rawArgs: unknown,
): Promise<JsonRpcSuccess | JsonRpcError> {
  if (!hasScope(session, "rotate") && !hasScope(session, "read-credential-names")) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "Token does not have the 'rotate' or 'read-credential-names' scope.",
    );
  }

  const args = (rawArgs ?? {}) as RotateArgs;
  if (!args.credential_id) {
    return fail(req.id, E_INVALID_PARAMS, "credential_id required");
  }

  interface CredentialRow {
    id: string;
    project_id: string;
    service: string;
    env: string;
    label: string;
    last_rotated_at: string | null;
  }
  const supabase = createAdminClient();
  const credResult = await supabase
    .from("credentials")
    .select("id, project_id, service, env, label, last_rotated_at")
    .eq("id", args.credential_id)
    .is("deleted_at", null)
    .maybeSingle();
  const credential = credResult.data as CredentialRow | null;
  if (!credential) {
    return fail(req.id, E_INVALID_REQUEST, "Credential not found");
  }
  if (credential.project_id !== session.projectId) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "Credential does not belong to this project",
    );
  }

  const playbook = getPlaybook(credential.service);
  if (!playbook || playbook.rotationSteps.length === 0) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      `No rotation guide is available for the '${credential.service}' service yet. The user can still rotate manually by visiting the service dashboard and using the Edit button on this credential to record the new value in Sherpa.`,
    );
  }

  // Find the rotation guide matching this credential's key type. If we
  // can't infer the key type from the label, fall back to the first guide.
  const keyTypeId = inferKeyTypeFromLabel(credential.service, credential.label);
  const guide =
    (keyTypeId &&
      playbook.rotationSteps.find((g) => g.keyType === keyTypeId)) ||
    playbook.rotationSteps[0];

  if (!guide) {
    return fail(
      req.id,
      E_INTERNAL,
      "Couldn't resolve rotation guide for this credential.",
    );
  }

  // Build the Sherpa deep link the user can click to land directly on this
  // credential with the rotation playbook section open.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const sherpaDeepLink = `${siteUrl}/vault/${credential.project_id}?credential=${credential.id}&playbook=rotation`;

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: session.userId,
    project_id: session.projectId,
    credential_id: credential.id,
    action: "agent_rotate_requested",
    actor: `mcp_token:${session.tokenId}`,
    metadata: { service: credential.service, key_type: keyTypeId },
  } as never);

  const daysSinceRotation =
    credential.last_rotated_at != null
      ? Math.floor(
          (Date.now() - new Date(credential.last_rotated_at).getTime()) /
            86_400_000,
        )
      : null;

  const result = {
    credential: {
      id: credential.id,
      service: credential.service,
      service_name: playbook.meta.name,
      env: credential.env,
      label: credential.label,
      days_since_rotation: daysSinceRotation,
    },
    guide: {
      title: guide.title,
      dashboard_url: guide.dashboardUrl,
      supports_programmatic_rotation: guide.supportsProgrammaticRotation,
      warning: guide.warning ?? null,
      steps: guide.steps,
    },
    sherpa_deep_link: sherpaDeepLink,
    playbook_last_reviewed: playbook.meta.lastReviewed,
    next_action:
      "Present these steps to the user as numbered instructions. After they complete the rotation, the user should paste the new value into Sherpa using the deep link above — that re-encrypts the stored value and resets the rotation timer.",
  };

  // A text rendering for clients that don't read structuredContent.
  const text =
    `Rotation guide for ${guide.title} (${credential.label}):\n\n` +
    (guide.warning ? `⚠️  ${guide.warning}\n\n` : "") +
    guide.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") +
    `\n\nDashboard: ${guide.dashboardUrl}` +
    `\nWhen done, paste the new value into Sherpa: ${sherpaDeepLink}`;

  return success(req.id, {
    content: [{ type: "text", text }],
    structuredContent: result,
  });
}

// ---- sherpa_call_api ----

interface CallApiArgs {
  credential_id?: string;
  method?: string;
  path?: string;
  body?: unknown;
  extra_headers?: Record<string, string>;
}

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
// Headers the agent is not allowed to override — Sherpa controls these.
const RESERVED_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "host",
  "content-length",
]);

async function tool_callApi(
  req: JsonRpcRequest,
  session: AuthedSession,
  rawArgs: unknown,
): Promise<JsonRpcSuccess | JsonRpcError> {
  if (!hasScope(session, "call-api")) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "Token does not have the 'call-api' scope",
    );
  }

  const args = (rawArgs ?? {}) as CallApiArgs;
  const credentialId = args.credential_id;
  const method = args.method?.toUpperCase();
  const path = args.path;

  if (!credentialId) {
    return fail(req.id, E_INVALID_PARAMS, "credential_id required");
  }
  if (!method || !ALLOWED_METHODS.includes(method as (typeof ALLOWED_METHODS)[number])) {
    return fail(
      req.id,
      E_INVALID_PARAMS,
      `method must be one of: ${ALLOWED_METHODS.join(", ")}`,
    );
  }
  if (!path || !path.startsWith("/")) {
    return fail(req.id, E_INVALID_PARAMS, "path must start with '/'");
  }

  const supabase = createAdminClient();

  // Load the credential (RLS bypassed; we scope manually).
  interface CredentialRow {
    id: string;
    project_id: string;
    service: string;
    env: string;
    label: string;
  }
  const credResult = await supabase
    .from("credentials")
    .select("id, project_id, service, env, label")
    .eq("id", credentialId)
    .is("deleted_at", null)
    .maybeSingle();
  const credential = credResult.data as CredentialRow | null;
  if (!credential) {
    return fail(req.id, E_INVALID_REQUEST, "Credential not found");
  }
  if (credential.project_id !== session.projectId) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "Credential does not belong to this project",
    );
  }

  const provider = getProvider(credential.service);
  if (!provider) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      `Service '${credential.service}' is not yet supported by sherpa_call_api. Supported: stripe, github, openai, anthropic, resend, cloudflare, replicate.`,
    );
  }

  // Find an active, non-expired, non-revoked agent session for this project.
  interface SessionRow {
    id: string;
    wrapper_ciphertext: string;
    expires_at: string;
    revoked_at: string | null;
  }
  const sessionResult = await supabase
    .from("agent_sessions")
    .select("id, wrapper_ciphertext, expires_at, revoked_at")
    .eq("project_id", session.projectId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("authorized_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const agentSession = sessionResult.data as SessionRow | null;
  if (!agentSession) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "Agents not currently authorized for this project. The user must go to Sherpa → project settings → AI Agent access and click 'Authorize agents'.",
    );
  }

  // Find the session-encrypted ciphertext for this credential.
  interface SessionCredRow {
    session_ciphertext: string;
  }
  const sessionCredResult = await supabase
    .from("agent_session_credentials")
    .select("session_ciphertext")
    .eq("session_id", agentSession.id)
    .eq("credential_id", credentialId)
    .maybeSingle();
  const sessionCred = sessionCredResult.data as SessionCredRow | null;
  if (!sessionCred) {
    return fail(
      req.id,
      E_INVALID_REQUEST,
      "This credential was not included in the current agent session. The user may have added it after authorizing. Ask them to re-authorize.",
    );
  }

  // Unwrap K_s and decrypt the credential.
  let plaintextCredential: string;
  try {
    const sessionKey = await unwrapSessionKey(agentSession.wrapper_ciphertext);
    plaintextCredential = await decryptWithSessionKey(
      sessionCred.session_ciphertext,
      sessionKey,
    );
  } catch (err) {
    return fail(
      req.id,
      E_INTERNAL,
      `Decryption failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  // Build the outbound request.
  const url = provider.baseUrl + path;
  const authHeaders = provider.buildAuthHeaders(plaintextCredential);

  const outboundHeaders: Record<string, string> = {
    "User-Agent": "Sherpa-MCP/0.1",
  };
  // Apply caller-supplied extra headers first, but block reserved ones.
  if (args.extra_headers) {
    for (const [k, v] of Object.entries(args.extra_headers)) {
      if (RESERVED_HEADERS.has(k.toLowerCase())) continue;
      outboundHeaders[k] = String(v);
    }
  }
  // Then apply the auth headers (these win).
  for (const [k, v] of Object.entries(authHeaders)) {
    outboundHeaders[k] = v;
  }

  let outboundBody: string | undefined;
  if (args.body !== undefined && args.body !== null && method !== "GET") {
    if (typeof args.body === "string") {
      outboundBody = args.body;
    } else {
      outboundBody = JSON.stringify(args.body);
      outboundHeaders["Content-Type"] ??= "application/json";
    }
  }

  // Make the request.
  let providerResponse: Response;
  try {
    providerResponse = await fetch(url, {
      method,
      headers: outboundHeaders,
      body: outboundBody,
    });
  } catch (err) {
    return fail(
      req.id,
      E_INTERNAL,
      `Outbound request to ${provider.displayName} failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  // Read the response body.
  const responseText = await providerResponse.text();
  let responseBody: unknown = responseText;
  const responseContentType = providerResponse.headers.get("content-type") ?? "";
  if (responseContentType.includes("application/json")) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Keep as text if parse fails.
    }
  }

  // Update session last_used_at (fire and forget).
  void supabase
    .from("agent_sessions")
    .update({ last_used_at: new Date().toISOString() } as never)
    .eq("id", agentSession.id);

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: session.userId,
    project_id: session.projectId,
    credential_id: credentialId,
    action: "agent_call_api",
    actor: `mcp_token:${session.tokenId}`,
    metadata: {
      service: credential.service,
      method,
      path,
      status: providerResponse.status,
    },
  } as never);

  const summary = {
    status: providerResponse.status,
    statusText: providerResponse.statusText,
    service: credential.service,
    method,
    path,
    body: responseBody,
  };

  return success(req.id, {
    content: [
      {
        type: "text",
        text: JSON.stringify(summary, null, 2),
      },
    ],
    structuredContent: summary,
  });
}

// ---- top-level handler ----

async function handleRpc(
  rpc: JsonRpcRequest,
  session: AuthedSession,
): Promise<JsonRpcSuccess | JsonRpcError> {
  if (rpc.jsonrpc !== "2.0") {
    return fail(rpc.id, E_INVALID_REQUEST, "Only JSON-RPC 2.0 is supported");
  }

  switch (rpc.method) {
    case "initialize":
      return handleInitialize(rpc, session);
    case "initialized":
    case "notifications/initialized":
      // Notifications have no response.
      return success(rpc.id, {});
    case "tools/list":
      return handleToolsList(rpc);
    case "tools/call":
      return handleToolsCall(rpc, session);
    case "ping":
      return success(rpc.id, {});
    default:
      return fail(rpc.id, E_METHOD_NOT_FOUND, `Unknown method: ${rpc.method}`);
  }
}

// ---- route handlers ----

export async function POST(request: NextRequest) {
  const session = await authenticate(request);
  if (!session) {
    console.log("[MCP] Auth failed");
    return NextResponse.json(
      fail(null, E_INVALID_REQUEST, "Missing or invalid Bearer token"),
      { status: 401 },
    );
  }

  // Rate limit BEFORE parsing — there's no reason to do any work if the
  // request was going to be refused anyway. The check is a single round-
  // trip to Postgres so it's cheap.
  const rate = await checkRateLimit(session.tokenId);
  if (!rate.allowed) {
    console.log(
      `[MCP] Rate limit (${rate.window}) hit on token ${session.tokenId}: ` +
        `${rate.usage.perMinute}/min, ${rate.usage.perHour}/hour`,
    );
    // Audit (fire and forget)
    void createAdminClient()
      .from("audit_log")
      .insert({
        user_id: session.userId,
        project_id: session.projectId,
        action: "rate_limit_exceeded",
        actor: `mcp_token:${session.tokenId}`,
        metadata: {
          window: rate.window,
          per_minute: rate.usage.perMinute,
          per_hour: rate.usage.perHour,
        },
      } as never);
    return NextResponse.json(
      fail(
        null,
        -32000,
        `Rate limit exceeded (${rate.window}). Token did ${rate.usage.perMinute} requests in the last minute and ${rate.usage.perHour} in the last hour. Try again in ${rate.retryAfterSec ?? 60} seconds.`,
      ),
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec ?? 60),
          "X-RateLimit-Limit-Minute": "60",
          "X-RateLimit-Limit-Hour": "1000",
          "X-RateLimit-Window-Exceeded": rate.window ?? "unknown",
        },
      },
    );
  }
  // Record this request (fire and forget — non-blocking)
  void recordRateLimitEvent(session.tokenId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(fail(null, E_PARSE, "Invalid JSON body"), { status: 400 });
  }

  // Debug logging — show what the client is sending and what we send back.
  const methodPreview = Array.isArray(body)
    ? body.map((b) => (b as { method?: string })?.method).join(", ")
    : (body as { method?: string })?.method;
  console.log(`[MCP] → ${methodPreview ?? "<unknown>"} from token ${session.tokenId}`);

  // Support both single requests and batch arrays.
  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((rpc) => handleRpc(rpc as JsonRpcRequest, session)),
    );
    console.log(`[MCP] ← batch x${responses.length}`);
    return NextResponse.json(responses);
  }

  const response = await handleRpc(body as JsonRpcRequest, session);
  const isError = "error" in response;
  console.log(`[MCP] ← ${isError ? "ERROR " + JSON.stringify(response.error) : "ok"}`);
  return NextResponse.json(response);
}

// GET returns a friendly description for humans / browsers that hit the URL.
// MCP itself uses POST. SSE-based streaming would also be served here in a
// future iteration; for now we surface the server info.
export async function GET() {
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocolVersion: SUPPORTED_PROTOCOL_VERSION,
    transport: "http",
    docs: "POST a JSON-RPC 2.0 request with an Authorization: Bearer header to invoke MCP methods.",
    methods: ["initialize", "tools/list", "tools/call", "ping"],
    tools: TOOLS.map((t) => t.name),
  });
}
