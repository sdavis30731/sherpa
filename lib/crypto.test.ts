import { describe, it, expect } from "vitest";
import {
  deriveKey,
  encrypt,
  decrypt,
  generateSalt,
  toBase64,
  fromBase64,
  ARGON_PARAMS_TEST,
} from "./crypto";

const PASS = "correct horse battery staple 12345";

describe("crypto: base64 round-trip", () => {
  it("survives a round-trip", () => {
    const data = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(fromBase64(toBase64(data))).toEqual(data);
  });
});

describe("crypto: deriveKey", () => {
  it("rejects an empty passphrase", async () => {
    await expect(deriveKey("", generateSalt(), ARGON_PARAMS_TEST)).rejects.toThrow();
  });

  it("rejects a wrong-size salt", async () => {
    await expect(
      deriveKey(PASS, new Uint8Array(8), ARGON_PARAMS_TEST),
    ).rejects.toThrow();
  });

  it("produces a usable CryptoKey", async () => {
    const key = await deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
    expect(key.type).toBe("secret");
    expect(key.algorithm).toMatchObject({ name: "AES-GCM" });
  });

  it("is deterministic for the same inputs", async () => {
    const salt = generateSalt();
    const k1 = await deriveKey(PASS, salt, ARGON_PARAMS_TEST);
    const k2 = await deriveKey(PASS, salt, ARGON_PARAMS_TEST);
    const ct = await encrypt("hello", k1);
    await expect(decrypt(ct, k2)).resolves.toBe("hello");
  });
});

describe("crypto: encrypt/decrypt", () => {
  it("round-trips an empty string", async () => {
    const key = await deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
    const ct = await encrypt("", key);
    await expect(decrypt(ct, key)).resolves.toBe("");
  });

  it("round-trips a 1KB payload", async () => {
    const key = await deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
    const big = "x".repeat(1024);
    const ct = await encrypt(big, key);
    await expect(decrypt(ct, key)).resolves.toBe(big);
  });

  it("round-trips unicode", async () => {
    const key = await deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
    const unicode = "🦙 héllo, мир — sk_test_abc";
    const ct = await encrypt(unicode, key);
    await expect(decrypt(ct, key)).resolves.toBe(unicode);
  });

  it("fails with the wrong key", async () => {
    const salt = generateSalt();
    const key = await deriveKey(PASS, salt, ARGON_PARAMS_TEST);
    const wrong = await deriveKey("not the passphrase", salt, ARGON_PARAMS_TEST);
    const ct = await encrypt("secret", key);
    await expect(decrypt(ct, wrong)).rejects.toThrow();
  });

  it("fails on tampered ciphertext", async () => {
    const key = await deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
    const ct = await encrypt("secret", key);
    const tamperedBytes = fromBase64(ct);
    tamperedBytes[tamperedBytes.length - 1] ^= 1; // flip last bit
    const tampered = toBase64(tamperedBytes);
    await expect(decrypt(tampered, key)).rejects.toThrow();
  });

  it("uses a fresh IV every call (ciphertexts differ)", async () => {
    const key = await deriveKey(PASS, generateSalt(), ARGON_PARAMS_TEST);
    const a = await encrypt("same plaintext", key);
    const b = await encrypt("same plaintext", key);
    expect(a).not.toBe(b);
  });
});
