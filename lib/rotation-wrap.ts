/**
 * SHRP-051 — Server-side wrap/unwrap for rotation policies.
 *
 * The rotation orchestrator needs the source-provider credential
 * (e.g. a Stripe restricted key) and the target-platform API token
 * (e.g. a Vercel access token) in plaintext to run a rotation. Both
 * are stored encrypted at rest in rotation_policies, wrapped with
 * ROTATION_MASTER_KEY (env var, server-only, never sent to the
 * browser).
 *
 * Threat model — honest:
 *   Compromise of ROTATION_MASTER_KEY combined with database access
 *   exposes every auto-rotating credential at once. That's a
 *   meaningful blast radius. We document this trade-off to the
 *   founding cohort: auto-rotation is opt-in per credential, and
 *   credentials NOT marked auto-rotating remain zero-knowledge.
 *
 *   v1.1 hardening: per-policy keypair so DB-only compromise still
 *   needs each policy's wrapped private key to decrypt anything.
 *   Same shape as SHRP-107 but on the server side.
 *
 * Format:
 *   base64( iv (12 bytes) || AES-256-GCM ciphertext + tag )
 *
 * Mirrors the agency vault wrap format (lib/crypto.ts encrypt/decrypt)
 * but uses ROTATION_MASTER_KEY instead of a passphrase-derived key.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Load the rotation master key from the environment and import it as
 * a 32-byte buffer. Throws at first use if the env var is missing or
 * malformed — the rotation features are entirely opt-in, so callers
 * are expected to gate on a "is rotation configured?" check first.
 *
 * Expected format: base64-encoded 32 bytes (AES-256). Generate with:
 *     openssl rand -base64 32
 */
function loadMasterKey(): Buffer {
  const raw = process.env.ROTATION_MASTER_KEY;
  if (!raw) {
    throw new Error(
      "ROTATION_MASTER_KEY env var is not set. Auto-rotation features require it.",
    );
  }
  const buf = Buffer.from(raw.trim(), "base64");
  if (buf.byteLength !== 32) {
    throw new Error(
      `ROTATION_MASTER_KEY must decode to exactly 32 bytes (got ${buf.byteLength}). Generate with: openssl rand -base64 32`,
    );
  }
  return buf;
}

/**
 * Returns true if ROTATION_MASTER_KEY is present and well-formed.
 * Used to gate UI surfaces that depend on rotation being configured.
 */
export function isRotationConfigured(): boolean {
  const raw = process.env.ROTATION_MASTER_KEY;
  if (!raw) return false;
  try {
    return Buffer.from(raw.trim(), "base64").byteLength === 32;
  } catch {
    return false;
  }
}

/**
 * Wrap a plaintext string with ROTATION_MASTER_KEY. Returns base64
 * of (iv || ciphertext || tag). Use this when:
 *   - the agency enables rotation for a credential — wrap the
 *     source credential plaintext for storage in
 *     rotation_policies.source_credential_wrapped
 *   - the agency provides a target-platform token — wrap for
 *     rotation_policies.target_credential_wrapped
 *   - the orchestrator finishes a rotation — wrap the NEW source
 *     credential so the next cycle can use it
 */
export function wrapForRotation(plaintext: string): string {
  const key = loadMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Reverse of wrapForRotation. Throws on auth-tag failure (tampered
 * ciphertext or wrong master key).
 */
export function unwrapForRotation(wrappedB64: string): string {
  const key = loadMasterKey();
  const blob = Buffer.from(wrappedB64, "base64");
  if (blob.byteLength < 12 + 16) {
    throw new Error("Wrapped blob shorter than expected (need 12 IV + 16 tag minimum)");
  }
  const iv = blob.subarray(0, 12);
  // GCM tag is the trailing 16 bytes.
  const tag = blob.subarray(blob.byteLength - 16);
  const ciphertext = blob.subarray(12, blob.byteLength - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
