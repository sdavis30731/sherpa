import { describe, it, expect } from "vitest";
import {
  isWriteAction,
  summarizeAction,
  extractDollarAmountCents,
  extractEndpoint,
} from "./write-actions";

describe("isWriteAction", () => {
  describe("Stripe", () => {
    it("treats GET /charges as read", () => {
      expect(isWriteAction("stripe", "charges", "GET")).toBe(false);
    });

    it("treats GET /webhook_endpoints as read (the diagnostic demo)", () => {
      expect(isWriteAction("stripe", "webhook_endpoints", "GET")).toBe(false);
    });

    it("treats POST /refunds as write", () => {
      expect(isWriteAction("stripe", "refunds", "POST")).toBe(true);
    });

    it("treats POST /charges as write (creating a charge)", () => {
      expect(isWriteAction("stripe", "charges", "POST")).toBe(true);
    });

    it("treats DELETE /customers as write", () => {
      expect(isWriteAction("stripe", "customers", "DELETE")).toBe(true);
    });

    it("treats PATCH /subscriptions as write", () => {
      expect(isWriteAction("stripe", "subscriptions", "PATCH")).toBe(true);
    });
  });

  describe("GitHub", () => {
    it("treats GET /user as read", () => {
      expect(isWriteAction("github", "user", "GET")).toBe(false);
    });

    it("treats POST /repos (creating a repo) as write", () => {
      expect(isWriteAction("github", "repos", "POST")).toBe(true);
    });

    it("treats DELETE /repos as write", () => {
      expect(isWriteAction("github", "repos", "DELETE")).toBe(true);
    });
  });

  describe("Supabase", () => {
    it("treats GET /rest (PostgREST query) as read", () => {
      expect(isWriteAction("supabase", "rest", "GET")).toBe(false);
    });

    it("treats POST /rest (insert) as write", () => {
      expect(isWriteAction("supabase", "rest", "POST")).toBe(true);
    });

    it("treats DELETE /rest as write", () => {
      expect(isWriteAction("supabase", "rest", "DELETE")).toBe(true);
    });
  });

  describe("OpenAI", () => {
    it("treats GET /usage as read (spend check)", () => {
      expect(isWriteAction("openai", "usage", "GET")).toBe(false);
    });

    it("treats POST /completions as write (uses spend)", () => {
      expect(isWriteAction("openai", "completions", "POST")).toBe(true);
    });
  });

  describe("Conservative default behavior", () => {
    it("treats unknown services as write", () => {
      expect(isWriteAction("unknown_service", "anything", "GET")).toBe(true);
    });

    it("treats unknown endpoints on known services as write", () => {
      // 'transfers' not in Stripe's read list — should be write even on GET
      expect(isWriteAction("stripe", "transfers", "GET")).toBe(true);
    });

    it("treats known endpoint with disallowed method as write", () => {
      // GET /charges is read; POST /charges is write
      expect(isWriteAction("stripe", "charges", "POST")).toBe(true);
    });
  });

  describe("Endpoint prefix matching", () => {
    it("matches sub-paths under a read-list entry", () => {
      // 'list' on AWS covers 'list_buckets', 'list_instances' etc.
      expect(isWriteAction("aws", "list/buckets", "GET")).toBe(false);
      expect(isWriteAction("aws", "describe/instances", "GET")).toBe(false);
    });

    it("does NOT match partial endpoint name", () => {
      // 'charge' should NOT match 'charges' (substring not enough — needs slash boundary)
      expect(isWriteAction("stripe", "charge", "GET")).toBe(true);
    });
  });

  describe("Case-insensitive method handling", () => {
    it("accepts lowercase methods", () => {
      expect(isWriteAction("stripe", "charges", "get")).toBe(false);
      expect(isWriteAction("stripe", "refunds", "post")).toBe(true);
    });
  });
});

describe("summarizeAction", () => {
  it("formats a verb + service + endpoint summary", () => {
    const s = summarizeAction("stripe", "refunds", "POST");
    expect(s).toBe("POST stripe/refunds");
  });

  it("includes the first few params in the summary", () => {
    const s = summarizeAction("stripe", "refunds", "POST", {
      charge: "ch_3PqRk2",
      amount: 4800,
    });
    expect(s).toContain("charge=ch_3PqRk2");
    expect(s).toContain("amount=4800");
  });

  it("truncates long string param values", () => {
    const s = summarizeAction("stripe", "refunds", "POST", {
      reason: "a".repeat(100),
    });
    expect(s).toContain("...");
    expect(s.length).toBeLessThan(120);
  });

  it("caps the number of params shown", () => {
    const s = summarizeAction("stripe", "refunds", "POST", {
      a: 1, b: 2, c: 3, d: 4, e: 5,
    });
    // Only first 3 of {a,b,c,d,e} should appear
    expect(s).toContain("a=1");
    expect(s).toContain("b=2");
    expect(s).toContain("c=3");
    expect(s).not.toContain("d=4");
  });
});

describe("extractEndpoint", () => {
  it("strips Stripe's v1 prefix", () => {
    expect(extractEndpoint("/v1/charges")).toBe("charges");
  });

  it("strips multiple leading slashes", () => {
    expect(extractEndpoint("//v1/charges")).toBe("charges");
  });

  it("handles GitHub paths without version prefix", () => {
    expect(extractEndpoint("/repos/octocat/Hello-World")).toBe("repos");
  });

  it("handles Supabase rest path", () => {
    expect(extractEndpoint("/rest/v1/users?select=id")).toBe("rest");
  });

  it("strips Vercel's v9 prefix", () => {
    expect(extractEndpoint("/v9/projects")).toBe("projects");
  });

  it("strips 'api' prefix", () => {
    expect(extractEndpoint("/api/v1/items")).toBe("items");
  });

  it("handles trailing query strings", () => {
    expect(extractEndpoint("/v1/charges?limit=10&starting_after=ch_1")).toBe(
      "charges",
    );
  });

  it("returns empty string for empty path", () => {
    expect(extractEndpoint("/")).toBe("");
    expect(extractEndpoint("")).toBe("");
  });
});

describe("extractDollarAmountCents", () => {
  it("returns Stripe amount (already in cents) as-is", () => {
    expect(extractDollarAmountCents("stripe", { amount: 4800 })).toBe(4800);
  });

  it("returns amount_cents when provided", () => {
    expect(extractDollarAmountCents("custom", { amount_cents: 1999 })).toBe(1999);
  });

  it("converts amount_usd to cents", () => {
    expect(extractDollarAmountCents("custom", { amount_usd: 49.99 })).toBe(4999);
  });

  it("returns null when no amount field is present", () => {
    expect(extractDollarAmountCents("stripe", { charge: "ch_123" })).toBeNull();
  });

  it("returns null when params is undefined", () => {
    expect(extractDollarAmountCents("stripe")).toBeNull();
  });
});
