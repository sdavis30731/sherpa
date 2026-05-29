import { describe, it, expect } from "vitest";
import { detectKey, detectMismatch } from "./keyDetect";

describe("keyDetect", () => {
  it("returns null for an empty string", () => {
    expect(detectKey("")).toBeNull();
  });

  it("returns null for an obviously random short string", () => {
    expect(detectKey("hello")).toBeNull();
  });

  it("recognizes a Stripe live secret key", () => {
    const d = detectKey("sk_live_abcdefghij1234567890ABCDEFGHIJ");
    expect(d?.serviceId).toBe("stripe");
    expect(d?.keyTypeId).toBe("secret_key");
    expect(d?.confidence).toBeGreaterThan(0.95);
  });

  it("recognizes a Stripe test publishable key", () => {
    const d = detectKey("pk_test_abcdef1234567890ABCDEFGHIJ");
    expect(d?.serviceId).toBe("stripe");
    expect(d?.keyTypeId).toBe("publishable_key");
  });

  it("recognizes a Stripe webhook signing secret", () => {
    const d = detectKey("whsec_abcdef1234567890abcdef1234567890");
    expect(d?.serviceId).toBe("stripe");
    expect(d?.keyTypeId).toBe("webhook_secret");
  });

  it("recognizes a GitHub fine-grained PAT", () => {
    const d = detectKey("github_pat_11ABCDEFG_abcdef0123456789xyz");
    expect(d?.serviceId).toBe("github");
    expect(d?.keyTypeId).toBe("fine_grained_pat");
  });

  it("recognizes a GitHub classic PAT", () => {
    const d = detectKey("ghp_abcdefghij1234567890ABCDEFGHIJklm");
    expect(d?.serviceId).toBe("github");
    expect(d?.keyTypeId).toBe("classic_pat");
  });

  it("distinguishes Anthropic from OpenAI even though both start with sk-", () => {
    const a = detectKey("sk-ant-abcdefghij1234567890ABCDEFGHIJ");
    const o = detectKey("sk-abcdefghij1234567890ABCDEFGHIJKLM");
    expect(a?.serviceId).toBe("anthropic");
    expect(o?.serviceId).toBe("openai");
  });

  it("recognizes a Resend key", () => {
    const d = detectKey("re_abcdefghij1234567890ABCDEFGHIJ");
    expect(d?.serviceId).toBe("resend");
  });

  it("recognizes an AWS access key ID", () => {
    const d = detectKey("AKIAIOSFODNN7EXAMPLE");
    expect(d?.serviceId).toBe("aws");
  });

  it("flags a Supabase-shaped JWT", () => {
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJzdWIiOiIxMjM0NTY3ODkwMTIzNDU2Nzg5MCJ9." +
      "abcdefghij1234567890ABCDEFGHIJKLMNOPQR";
    const d = detectKey(fakeJwt);
    expect(d?.serviceId).toBe("supabase");
  });

  it("trims whitespace before detecting", () => {
    const d = detectKey("   sk_live_abcdefghij1234567890ABCDEFGHIJ   ");
    expect(d?.serviceId).toBe("stripe");
  });

  it("detectMismatch returns null when service matches", () => {
    const d = detectMismatch(
      "sk_live_abcdefghij1234567890ABCDEFGHIJ",
      { id: "stripe" },
    );
    expect(d).toBeNull();
  });

  it("detectMismatch flags a Stripe key pasted into Vercel", () => {
    const d = detectMismatch(
      "sk_live_abcdefghij1234567890ABCDEFGHIJ",
      { id: "vercel" },
    );
    expect(d?.serviceId).toBe("stripe");
  });
});
