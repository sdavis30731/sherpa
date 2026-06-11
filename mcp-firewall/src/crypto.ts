/**
 * Local vault crypto — AES-256-GCM with scrypt key derivation.
 *
 * No external dependencies. Uses node's built-in `crypto` module.
 *
 * Format of an encrypted blob (base64-encoded fields, dot-separated):
 *   salt . iv . ciphertext_with_tag
 *
 * The tag is appended to the ciphertext (GCM mode produces a 16-byte
 * authentication tag that we slice on decrypt).
 */

import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";

// scrypt cost parameters — tuned to take ~250ms on a modern laptop,
// which is fine for unlock-on-start workflows but cripples brute force.
const SCRYPT_N = 16384; // 2^14
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from a passphrase + salt using scrypt.
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase.normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
}

/**
 * Encrypt a UTF-8 plaintext string with the given passphrase. Returns a
 * URL-safe base64-encoded blob containing salt + iv + ciphertext + tag.
 */
export function encrypt(plaintext: string, passphrase: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(passphrase, salt);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString("base64"),
    iv.toString("base64"),
    Buffer.concat([ciphertext, tag]).toString("base64"),
  ].join(".");
}

/**
 * Decrypt a blob produced by `encrypt`. Throws if the passphrase is
 * wrong or the blob has been tampered with (GCM auth tag fails).
 */
export function decrypt(blob: string, passphrase: string): string {
  const parts = blob.split(".");
  if (parts.length !== 3) {
    throw new Error("Vault blob is malformed");
  }
  const [saltB64, ivB64, ctTagB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const ctTag = Buffer.from(ctTagB64, "base64");

  if (ctTag.length < TAG_LENGTH + 1) {
    throw new Error("Vault blob is too short");
  }
  const ciphertext = ctTag.subarray(0, ctTag.length - TAG_LENGTH);
  const tag = ctTag.subarray(ctTag.length - TAG_LENGTH);

  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  try {
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // GCM auth failure is the typical "wrong passphrase" path.
    throw new Error("Wrong passphrase, or vault has been tampered with");
  }
}
