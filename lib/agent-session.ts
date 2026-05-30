/**
 * Agent session encryption helpers — SHRP-040
 *
 * The browser generates a random 32-byte session key K_s to encrypt the
 * user's credential plaintexts during an agent authorization window.
 * The server wraps K_s with a master key (held only in env vars, never
 * accessible to the client) and stores the wrapped form. To decrypt
 * during a session, the server unwraps K_s with the master key, then
 * uses K_s to decrypt the per-credential ciphertexts.
 *
 * Master key handling:
 *   - Read from env var `AGENT_SESSION_MASTER_KEY`
 *   - Must be base64-encoded 32 bytes (= 44 chars or 43 + padding)
 *   - Generate with: openssl rand -base64 32
 *
 * If the master key is ever rotated, all active agent sessions become
 * unreadable (the wrapped K_s values can't be unwrapped with a different
 * master). Users would need to re-authorize. That's fine — it's also
 * a clean emergency revoke-all path.
 */

import { fromBase64, toBase64 } from "./crypto";

let cachedMasterKey: CryptoKey | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (cachedMasterKey) return cachedMasterKey;

  const raw = process.env.AGENT_SESSION_MASTER_KEY;
  if (!raw) {
    throw new Error(
      "AGENT_SESSION_MASTER_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = fromBase64(raw);
  } catch {
    throw new Error("AGENT_SESSION_MASTER_KEY is not valid base64");
  }
  if (bytes.byteLength !== 32) {
    throw new Error(
      `AGENT_SESSION_MASTER_KEY must be 32 bytes; got ${bytes.byteLength}`,
    );
  }

  cachedMasterKey = await crypto.subtle.importKey(
    "raw",
    bytes as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedMasterKey;
}

/**
 * Wrap a raw 32-byte session key with the master key.
 * Returns base64(iv || ciphertext+tag).
 */
export async function wrapSessionKey(sessionKeyRaw: Uint8Array): Promise<string> {
  if (sessionKeyRaw.byteLength !== 32) {
    throw new Error("Session key must be 32 bytes");
  }
  const master = await getMasterKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    master,
    sessionKeyRaw as BufferSource,
  );
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return toBase64(combined);
}

/** Unwrap a wrapped session key and import as an AES-GCM CryptoKey. */
export async function unwrapSessionKey(wrapped: string): Promise<CryptoKey> {
  const master = await getMasterKey();
  const combined = fromBase64(wrapped);
  if (combined.byteLength < 12 + 16) {
    throw new Error("Wrapped session key is too short");
  }
  const iv = combined.subarray(0, 12);
  const ct = combined.subarray(12);
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    master,
    ct as BufferSource,
  );
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Decrypt a session-encrypted credential ciphertext (produced in the
 * browser at session creation time) using a previously-unwrapped K_s.
 * Same format as lib/crypto.ts: base64(iv || ct+tag).
 */
export async function decryptWithSessionKey(
  payload: string,
  sessionKey: CryptoKey,
): Promise<string> {
  const combined = fromBase64(payload);
  if (combined.byteLength < 12 + 16) {
    throw new Error("Session ciphertext is too short");
  }
  const iv = combined.subarray(0, 12);
  const ct = combined.subarray(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    sessionKey,
    ct as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}
