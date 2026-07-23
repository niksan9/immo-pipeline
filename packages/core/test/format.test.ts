import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatEUR,
  formatSignedEUR,
  formatPercent,
  formatMono,
} from "../src/index.js";

describe("format helpers (de-DE)", () => {
  it("formatNumber rounds and groups", () => {
    expect(formatNumber(189000)).toBe("189.000");
    expect(formatNumber(1234.6)).toBe("1.235");
  });

  it("formatEUR appends the euro sign", () => {
    expect(formatEUR(189000)).toBe("189.000 €");
  });

  it("formatSignedEUR uses a typographic minus and explicit plus", () => {
    expect(formatSignedEUR(49)).toBe("+49 €");
    expect(formatSignedEUR(-72)).toBe("−72 €"); // U+2212
    expect(formatSignedEUR(0)).toBe("+0 €");
  });

  it("formatPercent uses a comma decimal", () => {
    expect(formatPercent(3.8)).toBe("3,8 %");
    expect(formatPercent(6)).toBe("6,0 %");
  });

  it("formatPercent uses a typographic minus for negatives (U+2212)", () => {
    expect(formatPercent(-1.5)).toBe("−1,5 %");
    expect(formatPercent(-1.5).charAt(0)).toBe("−");
    // No ASCII hyphen leaks through.
    expect(formatPercent(-1.5)).not.toContain("-");
    // Positive output is unchanged.
    expect(formatPercent(2.4)).toBe("2,4 %");
  });

  it("formatMono keeps fixed decimals with grouping", () => {
    expect(formatMono(1234.5)).toBe("1.234,50");
    expect(formatMono(1000, 0)).toBe("1.000");
  });
});
