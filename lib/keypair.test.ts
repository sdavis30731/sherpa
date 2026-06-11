import { describe, it, expect } from "vitest";
import {
  deriveKey,
  generateSalt,
  ARGON_PARAMS_TEST,
} from "./crypto";
import {
  generateAgencyKeypair,
  unwrapAgencyPrivateKey,
  sealForAgency,
  openFromAgency,
} from "./keypair";

const PASS = "correct horse battery staple 12345";

async function freshVaultKey() {
  return deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
}

describe("keypair: generation", () => {
  it("produces a base64 public key + wrapped private key", async () => {
    const vaultKey = await freshVaultKey();
    const kp = await generateAgencyKeypair(vaultKey);
    expect(typeof kp.publicKey).toBe("string");
    expect(typeof kp.wrappedPrivateKey).toBe("string");
    expect(kp.algo).toBe("x25519");
    // 32-byte public key encodes to 44 base64 chars (with one '=' pad).
    expect(kp.publicKey.length).toBeGreaterThanOrEqual(43);
  });

  it("generates a different keypair each time", async () => {
    const vaultKey = await freshVaultKey();
    const a = await generateAgencyKeypair(vaultKey);
    const b = await generateAgencyKeypair(vaultKey);
    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.wrappedPrivateKey).not.toBe(b.wrappedPrivateKey);
  });
});

describe("keypair: wrap / unwrap", () => {
  it("unwraps to a 32-byte private key with the right vault key", async () => {
    const vaultKey = await freshVaultKey();
    const kp = await generateAgencyKeypair(vaultKey);
    const priv = await unwrapAgencyPrivateKey(kp.wrappedPrivateKey, vaultKey);
    expect(priv.byteLength).toBe(32);
  });

  it("fails to unwrap with the wrong vault key", async () => {
    const vaultKeyA = await freshVaultKey();
    const vaultKeyB = await freshVaultKey();
    const kp = await generateAgencyKeypair(vaultKeyA);
    await expect(
      unwrapAgencyPrivateKey(kp.wrappedPrivateKey, vaultKeyB),
    ).rejects.toThrow();
  });

  it("rejects truncated wrapped blobs", async () => {
    const vaultKey = await freshVaultKey();
    await expect(
      unwrapAgencyPrivateKey("c2hvcnQ=", vaultKey), // "short" base64
    ).rejects.toThrow();
  });
});

describe("keypair: seal / open round-trip", () => {
  it("encrypts and decrypts a credential", async () => {
    const vaultKey = await freshVaultKey();
    const kp = await generateAgencyKeypair(vaultKey);

    const plaintext = "sk_live_REPLACE_WITH_YOUR_STRIPE_LIVE_SECRET";
    const sealed = await sealForAgency(plaintext, kp.publicKey);
    const priv = await unwrapAgencyPrivateKey(kp.wrappedPrivateKey, vaultKey);

    const opened = await openFromAgency(sealed, priv);
    expect(opened).toBe(plaintext);
  });

  it("produces different ciphertext on each call (ephemeral keypair)", async () => {
    const vaultKey = await freshVaultKey();
    const kp = await generateAgencyKeypair(vaultKey);
    const plaintext = "stable plaintext";

    const c1 = await sealForAgency(plaintext, kp.publicKey);
    const c2 = await sealForAgency(plaintext, kp.publicKey);
    expect(c1).not.toBe(c2);
  });

  it("fails to open with the wrong private key", async () => {
    const vaultKeyA = await freshVaultKey();
    const vaultKeyB = await freshVaultKey();
    const agencyA = await generateAgencyKeypair(vaultKeyA);
    const agencyB = await generateAgencyKeypair(vaultKeyB);

    const sealed = await sealForAgency("not for B", agencyA.publicKey);
    const privB = await unwrapAgencyPrivateKey(agencyB.wrappedPrivateKey, vaultKeyB);
    await expect(openFromAgency(sealed, privB)).rejects.toThrow();
  });

  it("rejects a tampered ciphertext (GCM tag check)", async () => {
    const vaultKey = await freshVaultKey();
    const kp = await generateAgencyKeypair(vaultKey);

    const sealed = await sealForAgency("hello", kp.publicKey);
    // Flip one bit in the middle of the ciphertext.
    const bytes = Uint8Array.from(atob(sealed), (c) => c.charCodeAt(0));
    bytes[bytes.byteLength - 5] ^= 0x01;
    let bin = "";
    for (let i = 0; i < bytes.byteLength; i++)
      bin += String.fromCharCode(bytes[i]!);
    const tampered = btoa(bin);

    const priv = await unwrapAgencyPrivateKey(kp.wrappedPrivateKey, vaultKey);
    await expect(openFromAgency(tampered, priv)).rejects.toThrow();
  });

  it("rejects a public key that isn't 32 bytes", async () => {
    await expect(sealForAgency("x", "AAAA")).rejects.toThrow();
  });

  it("rejects a private key that isn't 32 bytes", async () => {
    await expect(openFromAgency("AAAA", new Uint8Array(16))).rejects.toThrow();
  });
});
