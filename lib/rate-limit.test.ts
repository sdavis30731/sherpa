import { describe, it, expect } from "vitest";
import { evaluateRateLimit, DEFAULT_LIMITS } from "./rate-limit";

describe("evaluateRateLimit", () => {
  it("allows when usage is well under both limits", () => {
    const d = evaluateRateLimit({ perMinute: 5, perHour: 50 });
    expect(d.allowed).toBe(true);
    expect(d.window).toBeUndefined();
  });

  it("allows when usage is just under the minute limit", () => {
    const d = evaluateRateLimit({ perMinute: 59, perHour: 200 });
    expect(d.allowed).toBe(true);
  });

  it("rejects when at the minute limit (inclusive)", () => {
    const d = evaluateRateLimit({ perMinute: 60, perHour: 200 });
    expect(d.allowed).toBe(false);
    expect(d.window).toBe("minute");
    expect(d.retryAfterSec).toBe(60);
  });

  it("rejects when over the minute limit", () => {
    const d = evaluateRateLimit({ perMinute: 100, perHour: 200 });
    expect(d.allowed).toBe(false);
    expect(d.window).toBe("minute");
  });

  it("rejects on hour limit when minute is fine", () => {
    const d = evaluateRateLimit({ perMinute: 0, perHour: 1000 });
    expect(d.allowed).toBe(false);
    expect(d.window).toBe("hour");
    expect(d.retryAfterSec).toBe(3600);
  });

  it("prefers minute-window rejection when both are exceeded", () => {
    const d = evaluateRateLimit({ perMinute: 1000, perHour: 5000 });
    expect(d.window).toBe("minute");
  });

  it("respects custom limits", () => {
    const d = evaluateRateLimit(
      { perMinute: 11, perHour: 20 },
      { perMinute: 10, perHour: 100 },
    );
    expect(d.allowed).toBe(false);
    expect(d.window).toBe("minute");
  });

  it("returns observed usage in the decision", () => {
    const d = evaluateRateLimit({ perMinute: 42, perHour: 442 });
    expect(d.usage).toEqual({ perMinute: 42, perHour: 442 });
  });

  it("DEFAULT_LIMITS match the SHRP-035 spec", () => {
    expect(DEFAULT_LIMITS.perMinute).toBe(60);
    expect(DEFAULT_LIMITS.perHour).toBe(1000);
  });
});
