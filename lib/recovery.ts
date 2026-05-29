/**
 * Recovery code helpers — SHRP-006
 *
 * A recovery code is a BIP-39 12-word mnemonic generated client-side at
 * signup. It is shown to the user exactly once. From it we derive a separate
 * Argon2id key that wraps a copy of the user's vault key. The wrapped copy
 * is stored on the server; the words themselves are NEVER stored.
 *
 * If the user forgets their passphrase, they enter the recovery words,
 * which derive the recovery key, which unwraps the vault key.
 *
 * If they lose the words AND the passphrase, the vault is unreadable.
 * That is the painful but honest tradeoff.
 */

import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { ARGON_PARAMS_PRODUCTION, type ArgonParams, deriveKey, generateSalt } from "./crypto";

/** Generate a fresh 12-word BIP-39 recovery code. */
export function generateRecoveryCode(): string {
  return generateMnemonic(wordlist, 128);
}

/** Split a recovery code into its individual words. */
export function recoveryWords(code: string): string[] {
  return code.trim().split(/\s+/);
}

/** Normalize user-entered words: trim, lowercase, single-space-join. */
export function normalizeRecoveryInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** Pick two random positions (1-indexed) for the day-7 verification check. */
export function pickVerificationPositions(seed: number, wordCount = 12): [number, number] {
  // Deterministic but spread out across the word list.
  const a = (seed % (wordCount - 2)) + 1;
  let b = ((seed * 7 + 3) % wordCount) + 1;
  if (b === a) b = ((b + 1) % wordCount) + 1;
  return [a, b];
}

/**
 * Derive an AES-256-GCM key from a recovery code. Uses Argon2id with a
 * dedicated salt (separate from the passphrase salt).
 */
export async function deriveRecoveryKey(
  code: string,
  salt: Uint8Array,
  params: ArgonParams = ARGON_PARAMS_PRODUCTION,
) {
  return deriveKey(code, salt, params);
}

export { generateSalt };
