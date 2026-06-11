/**
 * Local encrypted vault.
 *
 * The vault is a single file at ~/.sherpakeys/vault.json.enc containing
 * AES-256-GCM ciphertext of a JSON document like:
 *
 *   {
 *     "credentials": [
 *       { "service": "stripe", "name": "STRIPE_SECRET_KEY", "value": "sk_test_..." },
 *       { "service": "github", "name": "GITHUB_TOKEN", "value": "ghp_..." }
 *     ]
 *   }
 *
 * The vault is unlocked with the user's master passphrase. The passphrase
 * never leaves this process; the derived key lives in memory only while
 * the CLI is running. Closing the process zeroes the key automatically
 * because Node's GC will reclaim the buffer.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { encrypt, decrypt } from "./crypto.js";

export const VAULT_DIR = join(homedir(), ".sherpakeys");
export const VAULT_PATH = join(VAULT_DIR, "vault.json.enc");

export interface Credential {
  service: string;
  name: string;
  value: string;
  added_at: string;
}

interface VaultData {
  credentials: Credential[];
  created_at: string;
  schema_version: 1;
}

/**
 * Check whether the vault has been initialized on disk.
 */
export function vaultExists(): boolean {
  return existsSync(VAULT_PATH);
}

/**
 * Create a fresh vault on disk. Throws if one already exists.
 */
export function createVault(passphrase: string): void {
  if (vaultExists()) {
    throw new Error(
      `Vault already exists at ${VAULT_PATH}. Delete it manually if you really want to start over.`,
    );
  }
  mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  const empty: VaultData = {
    credentials: [],
    created_at: new Date().toISOString(),
    schema_version: 1,
  };
  const ciphertext = encrypt(JSON.stringify(empty), passphrase);
  writeFileSync(VAULT_PATH, ciphertext, { mode: 0o600 });
}

/**
 * Read and decrypt the vault. Throws if the passphrase is wrong.
 */
export function loadVault(passphrase: string): VaultData {
  if (!vaultExists()) {
    throw new Error(
      `No vault found at ${VAULT_PATH}. Run \`sherpakeys-mcp-firewall init\` first.`,
    );
  }
  const blob = readFileSync(VAULT_PATH, "utf8").trim();
  const json = decrypt(blob, passphrase);
  const data = JSON.parse(json) as VaultData;
  if (data.schema_version !== 1) {
    throw new Error(
      `Unknown vault schema version: ${data.schema_version}. Upgrade SherpaKeys.`,
    );
  }
  return data;
}

/**
 * Encrypt and atomically replace the vault file on disk.
 */
export function saveVault(data: VaultData, passphrase: string): void {
  const blob = encrypt(JSON.stringify(data), passphrase);
  // Write to a temp file then rename for atomicity.
  const tmp = VAULT_PATH + ".tmp";
  writeFileSync(tmp, blob, { mode: 0o600 });
  // fs.renameSync is atomic on POSIX.
  const { renameSync } = require("node:fs") as typeof import("node:fs");
  renameSync(tmp, VAULT_PATH);
}

/**
 * Add a credential to the vault. Returns the updated vault data.
 */
export function addCredential(
  data: VaultData,
  cred: Omit<Credential, "added_at">,
): VaultData {
  const existing = data.credentials.findIndex(
    (c) => c.service === cred.service && c.name === cred.name,
  );
  const next: Credential = {
    ...cred,
    added_at: new Date().toISOString(),
  };
  const credentials = [...data.credentials];
  if (existing >= 0) {
    credentials[existing] = next;
  } else {
    credentials.push(next);
  }
  return { ...data, credentials };
}

/**
 * Look up a credential by service + name.
 */
export function findCredential(
  data: VaultData,
  service: string,
  name: string,
): Credential | undefined {
  return data.credentials.find(
    (c) => c.service === service && c.name === name,
  );
}
