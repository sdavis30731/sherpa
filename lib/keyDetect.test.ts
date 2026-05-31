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

  // ----- SHRP-041j: env-key name fallback -----
  describe("env-key name fallback", () => {
    it("detects Stripe secret key from name when value is redacted", () => {
      const d = detectKey("REDACTEDxxxxxxxxxxxxx", "STRIPE_SECRET_KEY");
      expect(d?.serviceId).toBe("stripe");
      expect(d?.keyTypeId).toBe("secret_key");
    });

    it("detects Stripe webhook secret from name when value is redacted", () => {
      const d = detectKey("REDACTED", "STRIPE_WEBHOOK_SECRET");
      expect(d?.serviceId).toBe("stripe");
      expect(d?.keyTypeId).toBe("webhook_secret");
    });

    it("detects Supabase service_role from name when value is redacted", () => {
      const d = detectKey("REDACTED", "SUPABASE_SERVICE_ROLE_KEY");
      expect(d?.serviceId).toBe("supabase");
      expect(d?.keyTypeId).toBe("service_role_key");
    });

    it("detects Supabase anon from name when value is redacted", () => {
      const d = detectKey("REDACTED", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(d?.serviceId).toBe("supabase");
      expect(d?.keyTypeId).toBe("anon_key");
    });

    it("detects GitHub token from name when value is redacted", () => {
      const d = detectKey("REDACTED", "GITHUB_TOKEN");
      expect(d?.serviceId).toBe("github");
      expect(d?.keyTypeId).toBe("classic_pat");
    });

    it("detects OpenAI from name when value is junk", () => {
      const d = detectKey("REDACTED", "OPENAI_API_KEY");
      expect(d?.serviceId).toBe("openai");
    });

    it("detects Resend from name when value is junk", () => {
      const d = detectKey("REDACTED", "RESEND_API_KEY");
      expect(d?.serviceId).toBe("resend");
    });

    it("recognizes Supabase project URL by VALUE shape", () => {
      const d = detectKey("https://abc123.supabase.co");
      expect(d?.serviceId).toBe("supabase");
      expect(d?.keyTypeId).toBe("project_url");
    });

    it("upgrades a JWT to service_role when env name says so", () => {
      const fakeJwt =
        "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxfQ.REDACTEDxxxxxxxxxxxxxxxxxxx";
      const d = detectKey(fakeJwt, "SUPABASE_SERVICE_ROLE_KEY");
      expect(d?.serviceId).toBe("supabase");
      expect(d?.keyTypeId).toBe("service_role_key");
    });

    it("keeps JWT as anon when env name says anon", () => {
      const fakeJwt =
        "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MX0.REDACTEDxxxxxxxxxxxxxxxxxxx";
      const d = detectKey(fakeJwt, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(d?.serviceId).toBe("supabase");
      expect(d?.keyTypeId).toBe("anon_key");
    });

    it("value prefix wins over a conflicting env-key name", () => {
      // Someone pasted a real Stripe key into a slot named "OPENAI_API_KEY"
      // — the value is the truth, not the slot.
      const d = detectKey(
        "sk_live_abcdefghij1234567890ABCDEFGHIJ",
        "OPENAI_API_KEY",
      );
      expect(d?.serviceId).toBe("stripe");
    });
  });
});
