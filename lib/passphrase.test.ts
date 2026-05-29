import { describe, it, expect } from "vitest";
import { estimatePassphrase } from "./passphrase";

describe("passphrase strength", () => {
  it("flags an empty input as very weak", () => {
    expect(estimatePassphrase("").score).toBe(0);
  });

  it("rejects common passwords with a score of 0", () => {
    expect(estimatePassphrase("password").score).toBe(0);
    expect(estimatePassphrase("123456").score).toBe(0);
  });

  it("considers a long mixed phrase strong", () => {
    const r = estimatePassphrase("PurpleOtter!Ladders42$Quiet");
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.entropyBits).toBeGreaterThanOrEqual(60);
  });

  it("penalizes simple sequences", () => {
    const a = estimatePassphrase("abcd1234");
    expect(a.score).toBeLessThanOrEqual(1);
  });

  it("penalizes repeats", () => {
    const a = estimatePassphrase("Aaaa1111!!!!");
    const b = estimatePassphrase("Bx7q!Lp9?Mn3$");
    expect(a.score).toBeLessThan(b.score);
  });
});
