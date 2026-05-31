import { describe, it, expect } from "vitest";
import { parseEnv } from "./envParser";

describe("parseEnv: basics", () => {
  it("returns no entries for empty input", () => {
    const r = parseEnv("");
    expect(r.entries).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.duplicateKeys).toEqual([]);
  });

  it("parses a simple KEY=VALUE line", () => {
    const r = parseEnv("FOO=bar");
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0]).toEqual({ line: 1, key: "FOO", value: "bar" });
  });

  it("skips blank lines and comments", () => {
    const r = parseEnv("# this is a comment\n\nFOO=bar\n# another\n");
    expect(r.entries).toEqual([{ line: 3, key: "FOO", value: "bar" }]);
  });

  it("tolerates whitespace around the = sign", () => {
    const r = parseEnv("FOO  =   bar");
    expect(r.entries[0]?.value).toBe("bar");
  });

  it("recognises an `export` prefix", () => {
    const r = parseEnv("export FOO=bar");
    expect(r.entries[0]).toMatchObject({ key: "FOO", value: "bar" });
  });
});

describe("parseEnv: quoting", () => {
  it("strips double quotes from values", () => {
    const r = parseEnv('FOO="bar baz"');
    expect(r.entries[0]?.value).toBe("bar baz");
  });

  it("strips single quotes from values", () => {
    const r = parseEnv("FOO='bar baz'");
    expect(r.entries[0]?.value).toBe("bar baz");
  });

  it("resolves \\n inside double-quoted strings", () => {
    const r = parseEnv('FOO="line1\\nline2"');
    expect(r.entries[0]?.value).toBe("line1\nline2");
  });

  it("does NOT resolve \\n inside single-quoted strings", () => {
    const r = parseEnv("FOO='line1\\nline2'");
    expect(r.entries[0]?.value).toBe("line1\\nline2");
  });

  it("does not strip quotes that don't surround the whole value", () => {
    const r = parseEnv('FOO=he said "hello"');
    expect(r.entries[0]?.value).toBe('he said "hello"');
  });
});

describe("parseEnv: inline comments", () => {
  it("strips a trailing `# comment` from an unquoted value", () => {
    const r = parseEnv("FOO=bar # this is a comment");
    expect(r.entries[0]?.value).toBe("bar");
  });

  it("preserves a # that appears inside quotes", () => {
    const r = parseEnv('FOO="bar # not a comment"');
    expect(r.entries[0]?.value).toBe("bar # not a comment");
  });

  it("preserves a # that is not preceded by whitespace", () => {
    const r = parseEnv("FOO=color#FF0000");
    expect(r.entries[0]?.value).toBe("color#FF0000");
  });
});

describe("parseEnv: warnings", () => {
  it("warns on a line with no equals sign", () => {
    const r = parseEnv("this is garbage\nFOO=bar");
    expect(r.entries).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]?.reason).toMatch(/No '='/);
  });

  it("warns on an invalid key", () => {
    const r = parseEnv("9FOO=bar");
    expect(r.entries).toEqual([]);
    expect(r.warnings[0]?.reason).toMatch(/Invalid key/);
  });
});

describe("parseEnv: duplicates", () => {
  it("records duplicate keys", () => {
    const r = parseEnv("FOO=one\nFOO=two\nBAR=three");
    expect(r.entries).toHaveLength(3); // Both FOOs are kept
    expect(r.duplicateKeys).toEqual(["FOO"]);
  });
});

describe("parseEnv: realistic .env", () => {
  it("handles a typical vibe coder .env file", () => {
    const text = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.signature
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature"

# Stripe
STRIPE_SECRET_KEY=sk_test_abcdefghij1234567890ABCDEFGHIJ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_abcdefghij1234567890ABCDEFGHIJ
STRIPE_WEBHOOK_SECRET=whsec_abcdefghij1234567890abcdef1234567890

# OpenAI
OPENAI_API_KEY="sk-1234567890abcdefghijklmnopqrstuv"   # don't share this`;

    const r = parseEnv(text);
    expect(r.entries.length).toBe(7);
    expect(r.entries.find((e) => e.key === "OPENAI_API_KEY")?.value).toBe(
      "sk-1234567890abcdefghijklmnopqrstuv",
    );
    expect(r.entries.find((e) => e.key === "SUPABASE_SERVICE_ROLE_KEY")?.value).toMatch(
      /^eyJ/,
    );
    expect(r.warnings).toEqual([]);
  });
});
