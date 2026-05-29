import { describe, it, expect } from "vitest";
import { evaluateRotation } from "./rotation";

const D = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

describe("evaluateRotation", () => {
  it("returns 'unknown' for a credential added today with no rotation", () => {
    const r = evaluateRotation(null, 90, iso(0.2 * D));
    expect(r.status).toBe("unknown");
  });

  it("returns 'overdue' for a credential never rotated and older than 1 day", () => {
    const r = evaluateRotation(null, 90, iso(2 * D));
    expect(r.status).toBe("overdue");
  });

  it("returns 'ok' well within the interval", () => {
    const r = evaluateRotation(iso(10 * D), 90);
    expect(r.status).toBe("ok");
    expect(r.daysOverdue).toBe(0);
  });

  it("returns 'due' inside the last 20% of the interval", () => {
    const r = evaluateRotation(iso(80 * D), 90);
    expect(r.status).toBe("due");
  });

  it("returns 'overdue' past the interval", () => {
    const r = evaluateRotation(iso(120 * D), 90);
    expect(r.status).toBe("overdue");
    expect(r.daysOverdue).toBeGreaterThanOrEqual(29);
  });
});
