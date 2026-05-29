/**
 * Sherpa crypto helpers — SHRP-007
 *
 * - Argon2id key derivation from a user passphrase + salt.
 * - AES-256-GCM authenticated encryption using Web Crypto.
 *
 * Security notes:
 *   - The passphrase is NEVER persisted anywhere. The derived key lives
 *     only in memory (React context) for the session.
 *   - We use Argon2id (memory-hard) at production parameters: t=3, m=64MiB, p=1.
 *     This is in line with OWASP 2025 guidance for interactive logins.
 *   - Every encrypted record uses a fresh 12-byte IV. AES-256-GCM provides
 *     authenticated encryption: tampered ciphertext fails decryption rather
 *     than producing garbage plaintext.
 *   - Output format: base64( iv (12 bytes) || ciphertext-with-tag ).
 */

import { argon2id } from "@noble/hashes/argon2";

export const ARGON_PARAMS_PRODUCTION = {
  t: 3, // iterations
  m: 65536, // 64 MiB memory cost
  p: 1, // parallelism
} as const;

export type ArgonParams = { t: number; m: number; p: number };

/** Cross-runtime accessor for Web Crypto (Node 20+ exposes it globally). */
function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("Web Crypto API is not available");
  return c.subtle;
}

function getRandomBytes(length: number): Uint8Array {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.getRandomValues) throw new Error("Web Crypto getRandomValues unavailable");
  return c.getRandomValues(new Uint8Array(length));
}

/** Generate a 16-byte random salt suitable for Argon2id. */
export function generateSalt(): Uint8Array {
  return getRandomBytes(16);
}

/**
 * Derive a 32-byte AES-256-GCM key from a passphrase using Argon2id, then
 * import it into Web Crypto as a non-extractable CryptoKey.
 *
 * @param passphrase user passphrase as a normal string
 * @param salt 16-byte salt (returned by generateSalt at signup)
 * @param params Argon2id params (defaults to PRODUCTION)
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  params: ArgonParams = ARGON_PARAMS_PRODUCTION,
): Promise<CryptoKey> {
  if (passphrase.length === 0) throw new Error("Passphrase must not be empty");
  if (salt.byteLength !== 16) throw new Error("Salt must be 16 bytes");

  const passwordBytes = new TextEncoder().encode(passphrase.normalize("NFKC"));
  const rawKey = argon2id(passwordBytes, salt, {
    t: params.t,
    m: params.m,
    p: params.p,
    dkLen: 32,
    version: 0x13,
  });

  // Import as non-extractable so the raw bytes cannot be exfiltrated.
  return getSubtle().importKey(
    "raw",
    rawKey as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a UTF-8 string with AES-256-GCM. Returns base64(iv || ct||tag). */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = getRandomBytes(12);
  const ciphertext = await getSubtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return toBase64(combined);
}

/** Decrypt a base64 payload produced by `encrypt`. Throws on tampering. */
export async function decrypt(payload: string, key: CryptoKey): Promise<string> {
  const combined = fromBase64(payload);
  if (combined.byteLength < 12 + 16) {
    throw new Error("Ciphertext too short");
  }
  const iv = combined.subarray(0, 12);
  const ct = combined.subarray(12);
  const plaintext = await getSubtle().decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * Lower-cost params for tests. Argon2id with m=65536 takes ~1-2s in pure JS
 * and would make the test suite intolerable.
 */
export const ARGON_PARAMS_TEST = { t: 2, m: 256, p: 1 } as const;

// ---------- base64 helpers (browser + node) ----------

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
