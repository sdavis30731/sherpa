import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  wrapForRotation,
  unwrapForRotation,
  isRotationConfigured,
} from "./rotation-wrap";
import { randomBytes } from "node:crypto";

// Set a deterministic master key for the test run.
const TEST_KEY = randomBytes(32).toString("base64");
let prevEnv: string | undefined;

beforeAll(() => {
  prevEnv = process.env.ROTATION_MASTER_KEY;
  process.env.ROTATION_MASTER_KEY = TEST_KEY;
});

afterAll(() => {
  if (prevEnv === undefined) delete process.env.ROTATION_MASTER_KEY;
  else process.env.ROTATION_MASTER_KEY = prevEnv;
});

describe("rotation-wrap: configuration check", () => {
  it("returns true when env var is set to 32 base64 bytes", () => {
    expect(isRotationConfigured()).toBe(true);
  });

  it("returns false when env var is missing", () => {
    const saved = process.env.ROTATION_MASTER_KEY;
    delete process.env.ROTATION_MASTER_KEY;
    expect(isRotationConfigured()).toBe(false);
    process.env.ROTATION_MASTER_KEY = saved;
  });

  it("returns false when env var is malformed (wrong length)", () => {
    const saved = process.env.ROTATION_MASTER_KEY;
    process.env.ROTATION_MASTER_KEY = Buffer.from("too short").toString("base64");
    expect(isRotationConfigured()).toBe(false);
    process.env.ROTATION_MASTER_KEY = saved;
  });
});

describe("rotation-wrap: wrap / unwrap round-trip", () => {
  it("survives a round-trip", () => {
    const plaintext = "sk_live_REPLACE_WITH_YOUR_STRIPE_LIVE_SECRET";
    const wrapped = wrapForRotation(plaintext);
    expect(unwrapForRotation(wrapped)).toBe(plaintext);
  });

  it("produces different ciphertext on each call (random IV)", () => {
    const plaintext = "the same plaintext";
    const a = wrapForRotation(plaintext);
    const b = wrapForRotation(plaintext);
    expect(a).not.toBe(b);
  });

  it("rejects tampered ciphertext (GCM tag check)", () => {
    const wrapped = wrapForRotation("hello");
    const bytes = Buffer.from(wrapped, "base64");
    // Flip a bit in the ciphertext portion (after IV, before tag).
    bytes[15] ^= 0x01;
    const tampered = bytes.toString("base64");
    expect(() => unwrapForRotation(tampered)).toThrow();
  });

  it("rejects truncated blobs", () => {
    expect(() => unwrapForRotation("c2hvcnQ=")).toThrow();
  });

  it("handles unicode and long values", () => {
    const plaintext = "key=" + "🔑".repeat(100) + "_extra padding 🔐 with mix";
    const wrapped = wrapForRotation(plaintext);
    expect(unwrapForRotation(wrapped)).toBe(plaintext);
  });
});
