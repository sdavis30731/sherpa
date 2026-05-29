import { describe, it, expect } from "vitest";
import {
  generateRecoveryCode,
  recoveryWords,
  normalizeRecoveryInput,
  pickVerificationPositions,
} from "./recovery";

describe("recovery code", () => {
  it("generates 12 words", () => {
    expect(recoveryWords(generateRecoveryCode())).toHaveLength(12);
  });

  it("generates a different code each time", () => {
    const a = generateRecoveryCode();
    const b = generateRecoveryCode();
    expect(a).not.toBe(b);
  });

  it("normalizes user-entered input", () => {
    expect(normalizeRecoveryInput("  Apple  BANANA, cherry! ")).toBe(
      "apple banana cherry",
    );
  });

  it("picks two distinct positions within bounds", () => {
    for (let seed = 0; seed < 50; seed++) {
      const [a, b] = pickVerificationPositions(seed);
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(12);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(12);
    }
  });
});
