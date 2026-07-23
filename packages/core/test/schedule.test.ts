import { describe, it, expect } from "vitest";
import {
  calc,
  buildRentSchedule,
  risikoMonat,
  SCHEDULE_YEARS,
} from "../src/index.js";
import { baseState, makeRisk } from "./fixtures.js";

describe("buildRentSchedule — base (no measures, riskCost 0)", () => {
  const s = baseState(); // rent 1000, steig 2 → g=1.02, bankrate 856.7, nkMonat 180
  const c = calc(s);
  const rows = buildRentSchedule(s, c);

  it("produces 10 rows", () => {
    expect(rows).toHaveLength(SCHEDULE_YEARS);
    expect(rows[0]!.year).toBe(1);
    expect(rows[9]!.year).toBe(10);
  });

  it("year 1 = base rent, cashflow hand-computed", () => {
    // miete = 1000; cashflow = 1000 - 856.7 - 180 - 0 = -36.7
    expect(rows[0]!.miete).toBeCloseTo(1000, 6);
    expect(rows[0]!.cashflow).toBeCloseTo(-36.7, 4);
    expect(rows[0]!.adjusted).toBe(false);
  });

  it("year 2 applies steig and costGrowth once", () => {
    // miete = 1000*1.02 = 1020; nk = 180*1.02 = 183.6
    // cashflow = 1020 - 856.7 - 183.6 = -20.3
    expect(rows[1]!.miete).toBeCloseTo(1020, 6);
    expect(rows[1]!.cashflow).toBeCloseTo(-20.3, 4);
  });

  it("year 10 compounds 9 periods", () => {
    // miete = 1000*1.02^9 = 1195.092568
    // cashflow = miete - 856.7 - 180*1.02^9
    const factor = Math.pow(1.02, 9);
    expect(rows[9]!.miete).toBeCloseTo(1000 * factor, 4);
    expect(rows[9]!.cashflow).toBeCloseTo(1000 * factor - 856.7 - 180 * factor, 4);
  });

  it("no measures → all rows unadjusted", () => {
    expect(rows.every((r) => r.adjusted === false && r.measure === undefined)).toBe(
      true,
    );
  });
});

describe("buildRentSchedule — measures", () => {
  it("measure in year 1 lifts rent immediately", () => {
    const s = baseState();
    s.measures = [{ id: 1, title: "m1", year: 1, invest: 5000, uplift: 200 }];
    const c = calc(s);
    const rows = buildRentSchedule(s, c);
    expect(rows[0]!.miete).toBeCloseTo(1000 + 200, 6);
    expect(rows[0]!.adjusted).toBe(true);
    expect(rows[0]!.measure?.uplift).toBe(200);
    // Uplift persists in later years on top of steig growth.
    expect(rows[1]!.miete).toBeCloseTo(1000 * 1.02 + 200, 6);
    expect(rows[1]!.adjusted).toBe(false);
  });

  it("measure in year 10 only affects year 10", () => {
    const s = baseState();
    s.measures = [{ id: 1, title: "late", year: 10, invest: 8000, uplift: 150 }];
    const c = calc(s);
    const rows = buildRentSchedule(s, c);
    for (let y = 1; y <= 9; y++) {
      expect(rows[y - 1]!.miete).toBeCloseTo(1000 * Math.pow(1.02, y - 1), 6);
      expect(rows[y - 1]!.adjusted).toBe(false);
    }
    expect(rows[9]!.adjusted).toBe(true);
    expect(rows[9]!.miete).toBeCloseTo(1000 * Math.pow(1.02, 9) + 150, 4);
  });

  it("two measures accumulate uplift from their respective years", () => {
    const s = baseState();
    s.measures = [
      { id: 1, title: "bath", year: 3, invest: 6000, uplift: 200 },
      { id: 2, title: "kitchen", year: 6, invest: 4000, uplift: 100 },
    ];
    const c = calc(s);
    const rows = buildRentSchedule(s, c);
    // year 2: no uplift yet
    expect(rows[1]!.miete).toBeCloseTo(1000 * Math.pow(1.02, 1), 6);
    // year 3: +200
    expect(rows[2]!.miete).toBeCloseTo(1000 * Math.pow(1.02, 2) + 200, 4);
    expect(rows[2]!.adjusted).toBe(true);
    // year 5: still +200 (kitchen not yet)
    expect(rows[4]!.miete).toBeCloseTo(1000 * Math.pow(1.02, 4) + 200, 4);
    expect(rows[4]!.adjusted).toBe(false);
    // year 6: +300
    expect(rows[5]!.miete).toBeCloseTo(1000 * Math.pow(1.02, 5) + 300, 4);
    expect(rows[5]!.adjusted).toBe(true);
  });
});

describe("risikoMonat + schedule risk amortisation", () => {
  it("risikoMonat = round(riskCost / 120)", () => {
    expect(risikoMonat(0)).toBe(0);
    expect(risikoMonat(6000)).toBe(50); // 6000/120 = 50
    expect(risikoMonat(2600)).toBe(22); // 2600/120 = 21.66… → 22
    expect(risikoMonat(100)).toBe(1); // 100/120 = 0.833… → 1
  });

  it("schedule subtracts round(riskCost/120) from each year's cashflow", () => {
    const s = baseState();
    s.risks = [makeRisk({ id: "x", status: "covered", appliedCost: 6000 })];
    const c = calc(s);
    expect(c.riskCost).toBe(6000);
    const rm = risikoMonat(6000); // 50
    const rows = buildRentSchedule(s, c);
    // year 1: miete - bankrate - nkMonat - rm
    expect(rows[0]!.cashflow).toBeCloseTo(
      rows[0]!.miete - c.bankrate - c.nkMonat - rm,
      6,
    );
  });
});
