import { describe, it, expect } from "vitest";
import { evaluateRisk, worstRisk, type RiskCredentialInput } from "./risk-rules";

const baseCred: RiskCredentialInput = {
  service: "stripe",
  keyType: "secret_key",
  env: "production",
  value: "sk_test_abc123",
};

describe("risk: critical rules", () => {
  it("flags Supabase service_role with NEXT_PUBLIC_ prefix as critical", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "supabase",
      keyType: "service_role_key",
      env: "production",
      value: "eyJhbGc.body.sig",
      envKeyName: "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    });
    expect(matches[0]?.id).toBe("supabase.service_role.next_public");
    expect(matches[0]?.severity).toBe("critical");
  });

  it("does NOT flag Supabase service_role without NEXT_PUBLIC_ prefix", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "supabase",
      keyType: "service_role_key",
      env: "production",
      value: "eyJhbGc.body.sig",
      envKeyName: "SUPABASE_SERVICE_ROLE_KEY",
    });
    expect(matches.find((r) => r.id === "supabase.service_role.next_public")).toBeUndefined();
  });

  it("flags Stripe sk_live with NEXT_PUBLIC_ as critical", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "stripe",
      keyType: "secret_key",
      env: "production",
      value: "sk_live_abcdefg",
      envKeyName: "NEXT_PUBLIC_STRIPE_SECRET",
    });
    expect(matches[0]?.id).toBe("stripe.live_key.next_public");
    expect(matches[0]?.severity).toBe("critical");
  });
});

describe("risk: high severity rules", () => {
  it("flags Stripe sk_live in dev env as high", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "stripe",
      keyType: "secret_key",
      env: "dev",
      value: "sk_live_abc",
      envKeyName: "STRIPE_SECRET_KEY",
    });
    const r = matches.find((m) => m.id === "stripe.live_key.non_production");
    expect(r?.severity).toBe("high");
  });

  it("does NOT flag Stripe sk_test in dev (test mode is safe in dev)", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "stripe",
      keyType: "secret_key",
      env: "dev",
      value: "sk_test_abc",
    });
    expect(matches.find((m) => m.id === "stripe.live_key.non_production")).toBeUndefined();
  });

  it("flags AWS access key assigned to dev env as a production-key-in-dev risk", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "aws",
      keyType: "access_key",
      env: "dev",
      value: "AKIAIOSFODNN7EXAMPLE",
    });
    const r = matches.find((m) => m.id === "generic.prod_key_in_dev_slot");
    expect(r?.severity).toBe("high");
  });
});

describe("risk: medium severity rules", () => {
  it("flags a classic GitHub PAT as medium", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "github",
      keyType: "classic_pat",
      env: "production",
      value: "ghp_abcdef1234567890",
    });
    const r = matches.find((m) => m.id === "github.classic_pat");
    expect(r?.severity).toBe("medium");
  });

  it("does NOT flag a fine-grained GitHub PAT", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "github",
      keyType: "fine_grained_pat",
      env: "production",
      value: "github_pat_11ABCDEF_xyz",
    });
    expect(matches.find((m) => m.id === "github.classic_pat")).toBeUndefined();
  });
});

describe("risk: low severity rules", () => {
  it("reminds about OpenAI spend cap on any OpenAI api_key import", () => {
    const matches = evaluateRisk({
      ...baseCred,
      service: "openai",
      keyType: "api_key",
      env: "production",
      value: "sk-abcdef",
    });
    const r = matches.find((m) => m.id === "openai.spend_cap.unknown");
    expect(r?.severity).toBe("low");
  });

  it("flags credentials not rotated in over 180 days", () => {
    const matches = evaluateRisk({
      ...baseCred,
      daysSinceRotation: 200,
    });
    expect(matches.find((m) => m.id === "generic.stale_rotation")).toBeDefined();
  });

  it("does NOT flag freshly-rotated credentials", () => {
    const matches = evaluateRisk({
      ...baseCred,
      daysSinceRotation: 10,
    });
    expect(matches.find((m) => m.id === "generic.stale_rotation")).toBeUndefined();
  });
});

describe("risk: cross-credential rules", () => {
  it("flags a Stripe webhook signing secret paired with a live secret key", () => {
    const cred: RiskCredentialInput = {
      service: "stripe",
      keyType: "webhook_secret",
      env: "production",
      value: "whsec_abc",
    };
    const matches = evaluateRisk(cred, {
      siblings: [
        {
          service: "stripe",
          keyType: "secret_key",
          env: "production",
          value: "sk_live_xyz",
        },
      ],
    });
    expect(matches.find((m) => m.id === "stripe.webhook_with_live_secret")).toBeDefined();
  });
});

describe("risk: worstRisk", () => {
  it("returns null when no rules match", () => {
    expect(
      worstRisk({
        service: "stripe",
        keyType: "secret_key",
        env: "production",
        value: "sk_test_abc",
      }),
    ).toBeNull();
  });

  it("returns the highest-severity rule when multiple match", () => {
    const worst = worstRisk({
      service: "stripe",
      keyType: "secret_key",
      env: "dev",
      value: "sk_live_abc",
      envKeyName: "NEXT_PUBLIC_STRIPE_SECRET",
    });
    // Both R2 (high) and R3 (critical) fire — R3 should win.
    expect(worst?.severity).toBe("critical");
    expect(worst?.id).toBe("stripe.live_key.next_public");
  });
});
