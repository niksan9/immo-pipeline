import { describe, it, expect } from "vitest";
import { computeScore, scoreColor } from "../src/index.js";
import { makeRisk } from "./fixtures.js";

describe("computeScore — empty risk list", () => {
  it("uses the base constants", () => {
    const r = computeScore([]);
    expect(r.resolvedN).toBe(0);
    expect(r.totalCovered).toBe(0);
    expect(r.scoreVal).toBe(74); // clamp(round(74), 40, 95)
    expect(r.dokuVal).toBe(41); // clamp(41, 0, 95)
    expect(r.maxPreis).toBe(180600); // round(180600/100)*100
    expect(r.color).toBe("green");
  });
});

describe("computeScore — mixed set", () => {
  it("counts resolvedN for all non-open, totalCovered for covered only", () => {
    const risks = [
      makeRisk({ id: "a", status: "covered", appliedCost: 2600 }),
      makeRisk({ id: "b", status: "covered", appliedCost: 800 }),
      makeRisk({ id: "c", status: "accepted", appliedCost: 0 }),
      makeRisk({ id: "d", status: "question", appliedCost: 0 }),
      makeRisk({ id: "e", status: "open", appliedCost: 9999 }), // ignored
    ];
    const r = computeScore(risks);
    expect(r.resolvedN).toBe(4);
    expect(r.totalCovered).toBe(3400);
    // clamp(round(74 + 8 - 3400/1500), 40, 95) = round(79.733) = 80
    expect(r.scoreVal).toBe(80);
    // clamp(41 + 4*8, 0, 95) = 73
    expect(r.dokuVal).toBe(73);
    // round((180600 - 3400)/100)*100 = 177200
    expect(r.maxPreis).toBe(177200);
    expect(r.color).toBe("green");
  });
});

describe("computeScore — clamping at both bounds", () => {
  it("clamps scoreVal & dokuVal to the upper bound (95)", () => {
    const risks = Array.from({ length: 20 }, (_, i) =>
      makeRisk({ id: `r${i}`, status: "accepted", appliedCost: 0 }),
    );
    const r = computeScore(risks);
    // 74 + 40 = 114 → 95 ; 41 + 160 = 201 → 95
    expect(r.scoreVal).toBe(95);
    expect(r.dokuVal).toBe(95);
    expect(r.color).toBe("green");
  });

  it("clamps scoreVal to the lower bound (40) on heavy covered cost", () => {
    const risks = [makeRisk({ id: "big", status: "covered", appliedCost: 100000 })];
    const r = computeScore(risks);
    // round(74 + 2 - 100000/1500) = round(9.33) = 9 → clamp 40
    expect(r.scoreVal).toBe(40);
    expect(r.color).toBe("red");
  });
});

describe("computeScore — color thresholds", () => {
  it("yellow band", () => {
    // one covered risk, 30000 → 74 + 2 - 20 = 56
    const r = computeScore([
      makeRisk({ id: "m", status: "covered", appliedCost: 30000 }),
    ]);
    expect(r.scoreVal).toBe(56);
    expect(r.color).toBe("yellow");
  });

  it("scoreColor boundaries: 70 green, 69/50 yellow, 49 red", () => {
    expect(scoreColor(95)).toBe("green");
    expect(scoreColor(70)).toBe("green");
    expect(scoreColor(69)).toBe("yellow");
    expect(scoreColor(50)).toBe("yellow");
    expect(scoreColor(49)).toBe("red");
    expect(scoreColor(40)).toBe("red");
  });
});

describe("computeScore — maxPreis rounding", () => {
  it("rounds to the nearest 100", () => {
    // totalCovered 2650 → (180600-2650)/100 = 1779.5 → round 1780 → 178000
    const r = computeScore([
      makeRisk({ id: "x", status: "covered", appliedCost: 2650 }),
    ]);
    expect(r.maxPreis).toBe(178000);
  });
});
