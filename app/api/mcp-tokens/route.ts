/**
 * MCP token generation API — SHRP-029
 *
 * POST /api/mcp-tokens
 *   Body: { project_id: string, name: string, scopes?: string[] }
 *   Returns: { id: string, token: string }  ← plaintext token shown ONCE
 *
 * The token format is `shrp_` + 64 hex characters (32 random bytes).
 * The token is generated server-side, SHA-256 hashed, and only the
 * hash is stored. The plaintext is returned to the caller exactly once,
 * in the response to this route. After that, it cannot be retrieved —
 * if the user loses it, they generate a new one.
 *
 * Why SHA-256 rather than bcrypt: the tokens have 256 bits of entropy,
 * so brute-force resistance via slow KDF is unnecessary. A single SHA-256
 * pass is plenty for "if the DB leaks, attackers still can't use the
 * tokens" — they would have to guess the original 32-byte value.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOKEN_PREFIX = "shrp_";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return TOKEN_PREFIX + hex;
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ALLOWED_SCOPES = ["read-credential-names", "call-api", "rotate"] as const;

export async function POST(request: NextRequest) {
  let body: {
    project_id?: string;
    name?: string;
    scopes?: string[];
    /** SHRP-042: 'read' (default) or 'write' (still subject to per-action approval). */
    permission?: "read" | "write";
    /** SHRP-042: optional per-action dollar cap in cents. */
    dollar_cap_cents?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = body.project_id;
  const name = body.name?.trim();
  const scopes = body.scopes ?? ["read-credential-names", "call-api"];

  // SHRP-042: default new tokens to read-only. Callers must opt in to write.
  const permission = body.permission ?? "read";
  const dollarCapCents = body.dollar_cap_cents ?? null;

  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (permission !== "read" && permission !== "write") {
    return NextResponse.json(
      { error: "permission must be 'read' or 'write'" },
      { status: 400 },
    );
  }
  if (
    dollarCapCents !== null &&
    (!Number.isInteger(dollarCapCents) || dollarCapCents < 0)
  ) {
    return NextResponse.json(
      { error: "dollar_cap_cents must be a non-negative integer or omitted" },
      { status: 400 },
    );
  }

  // Validate scopes
  for (const s of scopes) {
    if (!ALLOWED_SCOPES.includes(s as (typeof ALLOWED_SCOPES)[number])) {
      return NextResponse.json(
        { error: `Unknown scope: ${s}` },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Confirm the user owns the project. RLS would also enforce this on
  // the insert, but we want to fail clean with a 403 rather than a
  // confusing RLS violation.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Generate and hash
  const token = generateToken();
  const tokenHash = await hashToken(token);

  const { data: inserted, error: insErr } = await supabase
    .from("mcp_tokens")
    .insert({
      project_id: projectId,
      user_id: user.id,
      name,
      token_hash: tokenHash,
      scopes,
      permission,
      dollar_cap_cents: dollarCapCents,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Could not create token" },
      { status: 500 },
    );
  }

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: user.id,
    project_id: projectId,
    action: "mcp_token_created",
    actor: "user",
    metadata: {
      token_id: inserted.id,
      name,
      scopes,
      permission,
      dollar_cap_cents: dollarCapCents,
    },
  });

  return NextResponse.json({
    id: inserted.id,
    token, // plaintext — ONLY time this is ever returned
  });
}
