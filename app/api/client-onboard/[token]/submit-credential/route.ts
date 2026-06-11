/**
 * POST /api/client-onboard/[token]/submit-credential
 *
 * SHRP-107 — Public endpoint hit by the client's browser when they
 * finish a per-service card. The browser has already encrypted the
 * credential with the agency's X25519 public key (sealed-box format
 * from lib/keypair.ts); we just store the ciphertext in
 * credential_submissions and return success.
 *
 * Server CANNOT decrypt this. The agency's vault key unwraps the
 * private half later in their browser.
 *
 * Body:
 *   { service: string, key_type?: string, label?: string, env?: string,
 *     ciphertext_b64: string }
 *
 * Auth: token in the URL is the bearer. Validated against
 * credential_requests.token + expires_at + revoked_at. No user
 * session expected.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICES } from "@/lib/services";

const VALID_SERVICE_IDS = new Set(SERVICES.map((s) => s.id));
const VALID_ENVS = new Set(["dev", "staging", "production"]);

interface PostBody {
  service?: unknown;
  key_type?: unknown;
  label?: unknown;
  env?: unknown;
  ciphertext_b64?: unknown;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const service =
    typeof body.service === "string" ? body.service.toLowerCase() : "";
  const keyType =
    typeof body.key_type === "string" ? body.key_type.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const env =
    typeof body.env === "string" && VALID_ENVS.has(body.env)
      ? body.env
      : "production";
  const ciphertextB64 =
    typeof body.ciphertext_b64 === "string" ? body.ciphertext_b64 : "";

  if (!VALID_SERVICE_IDS.has(service)) {
    return NextResponse.json({ error: "invalid_service" }, { status: 400 });
  }
  if (!ciphertextB64) {
    return NextResponse.json(
      { error: "missing_ciphertext" },
      { status: 400 },
    );
  }
  // Sanity check on ciphertext shape — at least 64 base64 chars
  // (sealed box is ≥60 bytes, ≥80 base64 chars in practice).
  if (ciphertextB64.length < 64 || ciphertextB64.length > 65536) {
    return NextResponse.json(
      { error: "ciphertext_size_out_of_range" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Validate the token + that the request is still open.
  const { data: requestRow, error: reqErr } = await admin
    .from("credential_requests")
    .select(
      "id, requested_services, expires_at, revoked_at, submitted_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (reqErr) {
    return NextResponse.json(
      { error: "lookup_failed", details: reqErr.message },
      { status: 500 },
    );
  }
  if (!requestRow) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  const r = requestRow as {
    id: string;
    requested_services: string[];
    expires_at: string;
    revoked_at: string | null;
    submitted_at: string | null;
  };
  if (r.revoked_at) {
    return NextResponse.json({ error: "request_revoked" }, { status: 410 });
  }
  if (r.submitted_at) {
    return NextResponse.json({ error: "already_submitted" }, { status: 410 });
  }
  if (new Date(r.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "request_expired" }, { status: 410 });
  }
  // Service has to be one of the ones the agency asked for.
  if (!Array.isArray(r.requested_services) || !r.requested_services.includes(service)) {
    return NextResponse.json(
      { error: "service_not_requested" },
      { status: 400 },
    );
  }

  const { data: inserted, error: insErr } = await admin
    .from("credential_submissions")
    .insert({
      request_id: r.id,
      service,
      key_type: keyType || null,
      label: label || null,
      env,
      ciphertext_b64: ciphertextB64,
    } as never)
    .select("id, submitted_at")
    .single();
  if (insErr || !inserted) {
    return NextResponse.json(
      { error: "insert_failed", details: insErr?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: (inserted as { id: string }).id,
      submitted_at: (inserted as { submitted_at: string }).submitted_at,
    },
    { status: 200 },
  );
}
