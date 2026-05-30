/**
 * Agent session management — SHRP-040
 *
 * POST /api/agent-sessions
 *   Body: {
 *     project_id: string,
 *     ttl_hours: number,                            // 1, 24, 168, etc.
 *     session_key_b64: string,                      // base64 of 32 random bytes (K_s)
 *     credentials: [                                // session-encrypted per-credential
 *       { credential_id: string, session_ciphertext: string }
 *     ]
 *   }
 *   Returns: { id, expires_at }
 *
 * DELETE /api/agent-sessions?project_id=...
 *   Revokes the active session for the given project.
 *
 * The session_key is wrapped server-side with the AGENT_SESSION_MASTER_KEY
 * before being stored. The raw form arrives in the request body, then
 * disappears — it's never persisted.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fromBase64 } from "@/lib/crypto";
import { wrapSessionKey } from "@/lib/agent-session";

const MAX_TTL_HOURS = 7 * 24; // 7 days
const MIN_TTL_HOURS = 1;

export async function POST(request: NextRequest) {
  let body: {
    project_id?: string;
    ttl_hours?: number;
    session_key_b64?: string;
    credentials?: Array<{ credential_id: string; session_ciphertext: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = body.project_id;
  const ttl = body.ttl_hours;
  const sessionKeyB64 = body.session_key_b64;
  const credentials = body.credentials ?? [];

  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  if (typeof ttl !== "number" || ttl < MIN_TTL_HOURS || ttl > MAX_TTL_HOURS) {
    return NextResponse.json(
      { error: `ttl_hours must be between ${MIN_TTL_HOURS} and ${MAX_TTL_HOURS}` },
      { status: 400 },
    );
  }
  if (!sessionKeyB64) {
    return NextResponse.json({ error: "session_key_b64 required" }, { status: 400 });
  }
  let sessionKeyRaw: Uint8Array;
  try {
    sessionKeyRaw = fromBase64(sessionKeyB64);
  } catch {
    return NextResponse.json({ error: "session_key_b64 is not valid base64" }, { status: 400 });
  }
  if (sessionKeyRaw.byteLength !== 32) {
    return NextResponse.json(
      { error: "session_key must decode to exactly 32 bytes" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Confirm the user owns the project.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Revoke any active session for this project first (only one at a time).
  await supabase
    .from("agent_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .is("revoked_at", null);

  // Wrap the session key with the master key.
  let wrapper: string;
  try {
    wrapper = await wrapSessionKey(sessionKeyRaw);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "wrap failed" },
      { status: 500 },
    );
  }

  const expiresAt = new Date(Date.now() + ttl * 3600_000).toISOString();

  const { data: session, error: sessionErr } = await supabase
    .from("agent_sessions")
    .insert({
      user_id: user.id,
      project_id: projectId,
      wrapper_ciphertext: wrapper,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();
  if (sessionErr || !session) {
    return NextResponse.json(
      { error: sessionErr?.message ?? "Could not create session" },
      { status: 500 },
    );
  }

  // Insert the per-credential session ciphertexts.
  if (credentials.length > 0) {
    const rows = credentials.map((c) => ({
      session_id: session.id,
      credential_id: c.credential_id,
      session_ciphertext: c.session_ciphertext,
    }));
    const { error: credsErr } = await supabase
      .from("agent_session_credentials")
      .insert(rows);
    if (credsErr) {
      // Roll back the session so we don't have a half-baked one.
      await supabase.from("agent_sessions").delete().eq("id", session.id);
      return NextResponse.json(
        { error: credsErr.message },
        { status: 500 },
      );
    }
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "agents_authorized",
    actor: "user",
    metadata: { ttl_hours: ttl, credential_count: credentials.length },
  });

  return NextResponse.json({
    id: session.id,
    expires_at: session.expires_at,
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabase
    .from("agent_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .is("revoked_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "agents_revoked",
    actor: "user",
  });

  return NextResponse.json({ ok: true });
}
