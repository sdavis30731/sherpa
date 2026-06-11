/**
 * Sherpa asymmetric keypair helpers — SHRP-107
 *
 * The Custody Record + client credential collection flows let people
 * other than the agency owner (specifically: the agency's clients)
 * deposit credentials into the agency's vault. The cryptographic
 * guarantee we want is "SherpaKeys cannot read those credentials
 * server-side, ever, no holding window."
 *
 * Architecture:
 *   - Agency has a long-lived X25519 keypair generated at vault setup.
 *     public_key is stored plaintext in users.public_key.
 *     private_key is wrapped with the agency's vault key (Argon2id
 *     derivative of their passphrase) and stored in
 *     users.wrapped_private_key. The wrapping uses AES-GCM with a
 *     fresh IV.
 *   - Client encrypts each credential with the agency's public key
 *     using an ephemeral-static X25519 sealed-box pattern:
 *         clientEphPriv, clientEphPub = X25519.keygen()
 *         shared = X25519.scalarMult(clientEphPriv, agencyPub)
 *         key = SHA-256(shared || clientEphPub || agencyPub)
 *         iv = random(12 bytes)
 *         ct = AES-256-GCM(key, iv, plaintext)
 *         blob = clientEphPub (32) || iv (12) || ct
 *   - Agency decrypts by deriving the same shared key:
 *         shared = X25519.scalarMult(agencyPriv, clientEphPub)
 *         same SHA-256 derivation, same AES-GCM decrypt
 *
 * Notes:
 *   - We bind the agency's public key into the key-derivation hash
 *     so a leaked ephemeral key can't unlock unrelated agencies'
 *     ciphertexts (defense in depth).
 *   - SHA-256(shared || clientEphPub || agencyPub) is a single-pass
 *     KDF — adequate for AES-256 keys. HKDF is the textbook answer
 *     but adds complexity; for this single-use case the SHA-256
 *     construction is fine and is the same shape libsodium uses
 *     internally for sealed boxes.
 *   - Output format is base64 throughout for ergonomic storage.
 *   - @noble/curves is pure-JS, audited, and works identically in
 *     Node + browser, so we don't need a Web Crypto path for X25519
 *     (which has spotty browser support today).
 */

import { x25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";

// ─── Helpers ───────────────────────────────────────────────────

function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("Web Crypto API is not available");
  return c.subtle;
}

function getRandomBytes(length: number): Uint8Array {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.getRandomValues)
    throw new Error("Web Crypto getRandomValues unavailable");
  return c.getRandomValues(new Uint8Array(length));
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
  // btoa is in both Node and browser globals.
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

// ─── Public keypair API ────────────────────────────────────────

export interface AgencyKeypair {
  /** base64 32-byte X25519 public key. Published in users.public_key. */
  publicKey: string;
  /**
   * base64 of (iv (12 bytes) || AES-GCM-encrypted 32-byte private key).
   * Wrapped with the agency's vault key. Stored in users.wrapped_private_key.
   */
  wrappedPrivateKey: string;
  /** Algorithm tag stored in users.keypair_algo. */
  algo: "x25519";
}

/**
 * Generate a fresh X25519 keypair and wrap the private half with the
 * agency's vault key (the same CryptoKey used to encrypt credentials).
 *
 * Returns the public key + wrapped private key in their base64 storage
 * forms, ready to write to users.public_key + users.wrapped_private_key.
 */
export async function generateAgencyKeypair(
  vaultKey: CryptoKey,
): Promise<AgencyKeypair> {
  const priv = x25519.utils.randomPrivateKey();
  const pub = x25519.getPublicKey(priv);

  const iv = getRandomBytes(12);
  const ctBuffer = await getSubtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    vaultKey,
    priv as unknown as BufferSource,
  );
  const ct = new Uint8Array(ctBuffer);

  return {
    publicKey: bytesToBase64(pub),
    wrappedPrivateKey: bytesToBase64(concatBytes(iv, ct)),
    algo: "x25519",
  };
}

/**
 * Unwrap a stored wrapped_private_key using the agency's vault key.
 * Returns the raw 32-byte X25519 private key.
 *
 * Throws if the vault key doesn't match (AES-GCM authentication fails).
 */
export async function unwrapAgencyPrivateKey(
  wrappedB64: string,
  vaultKey: CryptoKey,
): Promise<Uint8Array> {
  const blob = base64ToBytes(wrappedB64);
  if (blob.byteLength < 12 + 32 + 16) {
    // 12-byte IV + 32-byte key + 16-byte GCM tag minimum.
    throw new Error("wrapped_private_key shorter than expected");
  }
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  const ptBuffer = await getSubtle().decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    vaultKey,
    ct as unknown as BufferSource,
  );
  const pt = new Uint8Array(ptBuffer);
  if (pt.byteLength !== 32) {
    throw new Error("unwrapped private key is not 32 bytes");
  }
  return pt;
}

// ─── Sealed box (client-encrypts-for-agency) ──────────────────

/**
 * Encrypt a plaintext credential for the agency. Called in the
 * client-onboarding browser, never on the server. The agency's
 * public_key is read from the credential_requests page payload.
 *
 * Output blob layout (base64):
 *   clientEphPub (32 bytes) || iv (12 bytes) || AES-GCM ciphertext+tag
 */
export async function sealForAgency(
  plaintext: string,
  agencyPublicKeyB64: string,
): Promise<string> {
  const agencyPub = base64ToBytes(agencyPublicKeyB64);
  if (agencyPub.byteLength !== 32) {
    throw new Error("Agency public key must be 32 bytes");
  }

  // Ephemeral keypair — never persisted, regenerated per credential.
  const ephPriv = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephPriv);

  // X25519 ECDH. The shared secret is 32 bytes.
  const shared = x25519.getSharedSecret(ephPriv, agencyPub);

  // Derive the AES-GCM key. Binding clientEphPub + agencyPub into the
  // hash gives us defense against cross-protocol confusion.
  const derived = sha256(concatBytes(shared, ephPub, agencyPub));

  const symKey = await getSubtle().importKey(
    "raw",
    derived as unknown as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = getRandomBytes(12);
  const ptBytes = new TextEncoder().encode(plaintext);
  const ctBuffer = await getSubtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    symKey,
    ptBytes as unknown as BufferSource,
  );
  const ct = new Uint8Array(ctBuffer);

  return bytesToBase64(concatBytes(ephPub, iv, ct));
}

/**
 * Decrypt a sealed-box blob using the agency's unwrapped private key.
 * Called on the agency side after they unlock their vault and unwrap
 * their private key.
 *
 * Throws on any error (wrong key, tampered ciphertext, wrong length).
 */
export async function openFromAgency(
  blobB64: string,
  agencyPrivateKey: Uint8Array,
): Promise<string> {
  if (agencyPrivateKey.byteLength !== 32) {
    throw new Error("Agency private key must be 32 bytes");
  }
  const blob = base64ToBytes(blobB64);
  if (blob.byteLength < 32 + 12 + 16) {
    throw new Error("Sealed blob shorter than expected");
  }
  const ephPub = blob.slice(0, 32);
  const iv = blob.slice(32, 44);
  const ct = blob.slice(44);

  const agencyPub = x25519.getPublicKey(agencyPrivateKey);
  const shared = x25519.getSharedSecret(agencyPrivateKey, ephPub);
  const derived = sha256(concatBytes(shared, ephPub, agencyPub));

  const symKey = await getSubtle().importKey(
    "raw",
    derived as unknown as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const ptBuffer = await getSubtle().decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    symKey,
    ct as unknown as BufferSource,
  );
  return new TextDecoder().decode(ptBuffer);
}
