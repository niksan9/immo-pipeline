import { describe, it, expect } from "vitest";
import { calc, SCENARIO_FACTOR, DEFAULT_GRUNDERWERB_RATE } from "../src/index.js";
import { baseState, makeRisk } from "./fixtures.js";

describe("calc — full worked example", () => {
  // Hand-computed from baseState():
  //   preis=200000, rent=1000, maklerPct=0.0357, zins=4, tilg=2, ek=50000
  //   nkMonat = 100+50+30 = 180
  //   grunderwerb = 200000*0.055 = 11000
  //   notar       = 200000*0.016 = 3200
  //   makler      = 200000*0.0357 = 7140
  //   NK          = 21340
  //   GIK         = 200000 + 21340 = 221340
  //   ek          = min(50000, 221340) = 50000
  //   loan        = 171340
  //   zinsMonat   = 171340*0.04/12 = 571.13333…
  //   tilgMonat   = 171340*0.02/12 = 285.56667…
  //   bankrate    = 856.7
  //   cashflow    = 1000 - 856.7 - 180 = -36.7
  //   wertzuwachsM= 200000*0.02/12 = 333.33333…
  //   afaJahr     = 150000*0.02 = 3000
  //   steuerbasisJ= 12000 - 2160 - 6853.6 - 3000 = -13.6
  //   steuerJahr  = -13.6*0.42 = -5.712
  //   steuerMonat = 5.712/12 = 0.476
  //   cashflowNSt = -36.7 + 0.476 = -36.224
  //   vermoegen   = -36.7 + 285.56667 + 333.33333 + 0.476 = 582.676
  //   brutto      = 12000/200000*100 = 6.0
  //   netto       = 9840/221340*100 = 4.44565…
  //   faktor      = 200000/12000 = 16.66667
  //   ekRendite   = (-440.4 + 3426.8 + 4000)/50000*100 = 13.9728
  const c = calc(baseState());

  it("Kaufnebenkosten", () => {
    expect(c.grunderwerb).toBeCloseTo(11000, 6);
    expect(c.notar).toBeCloseTo(3200, 6);
    expect(c.makler).toBeCloseTo(7140, 6);
    expect(c.NK).toBeCloseTo(21340, 6);
  });

  it("GIK / ek / loan", () => {
    expect(c.preis).toBe(200000);
    expect(c.riskCost).toBe(0);
    expect(c.GIK).toBeCloseTo(221340, 6);
    expect(c.ek).toBe(50000);
    expect(c.loan).toBeCloseTo(171340, 6);
  });

  it("monthly financing", () => {
    expect(c.zinsMonat).toBeCloseTo(571.133333, 4);
    expect(c.tilgMonat).toBeCloseTo(285.566667, 4);
    expect(c.bankrate).toBeCloseTo(856.7, 4);
    expect(c.nkMonat).toBe(180);
  });

  it("cashflow and wealth", () => {
    expect(c.cashflow).toBeCloseTo(-36.7, 6);
    expect(c.wertzuwachsM).toBeCloseTo(333.333333, 4);
    expect(c.vermoegenszuwachs).toBeCloseTo(582.676, 4);
  });

  it("tax chain", () => {
    expect(c.afaJahr).toBeCloseTo(3000, 6);
    expect(c.steuerbasisJ).toBeCloseTo(-13.6, 4);
    expect(c.steuerJahr).toBeCloseTo(-5.712, 4);
    expect(c.steuerMonat).toBeCloseTo(0.476, 6);
    expect(c.cashflowNSt).toBeCloseTo(-36.224, 4);
  });

  it("yields and factor", () => {
    expect(c.brutto).toBeCloseTo(6.0, 6);
    expect(c.netto).toBeCloseTo(4.44565, 4);
    expect(c.faktor).toBeCloseTo(16.666667, 5);
    expect(c.ekRendite).toBeCloseTo(13.9728, 4);
  });
});

describe("calc — scenario factors", () => {
  it("applies base/bull/bear to rentBase", () => {
    expect(SCENARIO_FACTOR).toEqual({ base: 1.0, bull: 1.08, bear: 0.92 });

    const base = calc({ ...baseState(), scenario: "base" });
    const bull = calc({ ...baseState(), scenario: "bull" });
    const bear = calc({ ...baseState(), scenario: "bear" });

    expect(base.rent).toBeCloseTo(1000, 6);
    expect(bull.rent).toBeCloseTo(1080, 6);
    expect(bear.rent).toBeCloseTo(920, 6);
    // Gross yield scales with rent (price unchanged across cases here).
    expect(bull.brutto).toBeCloseTo(6.48, 6);
    expect(bear.brutto).toBeCloseTo(5.52, 6);
  });

  it("uses the price of the active scenario", () => {
    const s = baseState();
    s.priceByCase = { base: 200000, bull: 210000, bear: 180000 };
    expect(calc({ ...s, scenario: "bear" }).preis).toBe(180000);
    expect(calc({ ...s, scenario: "bull" }).preis).toBe(210000);
  });
});

describe("calc — ek capping and loan floor", () => {
  it("caps ek at GIK, producing loan = 0", () => {
    const s = baseState();
    s.financing = { ...s.financing, ek: 10_000_000 };
    const c = calc(s);
    expect(c.ek).toBeCloseTo(c.GIK, 6);
    expect(c.loan).toBe(0);
    expect(c.zinsMonat).toBe(0);
    expect(c.tilgMonat).toBe(0);
    expect(c.bankrate).toBe(0);
    // cashflow = rent - 0 - nkMonat
    expect(c.cashflow).toBeCloseTo(1000 - 180, 6);
  });

  it("ekRendite is 0 when ek = 0 (guard against div-by-zero)", () => {
    const s = baseState();
    s.financing = { ...s.financing, ek: 0 };
    const c = calc(s);
    expect(c.ek).toBe(0);
    expect(c.loan).toBeCloseTo(c.GIK, 6);
    expect(c.ekRendite).toBe(0);
  });
});

describe("calc — riskCost only counts covered", () => {
  it("ignores open/accepted/question, sums only covered.appliedCost", () => {
    const s = baseState();
    s.risks = [
      makeRisk({ id: "a", status: "covered", appliedCost: 2600 }),
      makeRisk({ id: "b", status: "covered", appliedCost: 800 }),
      makeRisk({ id: "c", status: "accepted", appliedCost: 0 }),
      makeRisk({ id: "d", status: "question", appliedCost: 0 }),
      // An open risk with a stray appliedCost must NOT count.
      makeRisk({ id: "e", status: "open", appliedCost: 9999 }),
    ];
    const c = calc(s);
    expect(c.riskCost).toBe(3400);
    expect(c.GIK).toBeCloseTo(200000 + 21340 + 3400, 6);
  });
});

describe("calc — provisionsfrei and negative cashflow", () => {
  it("maklerPct = 0 removes the makler component from NK", () => {
    const s = baseState();
    s.financing = { ...s.financing, maklerPct: 0 };
    const c = calc(s);
    expect(c.makler).toBe(0);
    expect(c.NK).toBeCloseTo(11000 + 3200, 6);
  });

  it("high interest yields a clearly negative cashflow", () => {
    const s = baseState();
    s.financing = { ...s.financing, zins: 8.0 };
    const c = calc(s);
    expect(c.cashflow).toBeLessThan(0);
  });
});

describe("calc — steuerMonat sign logic", () => {
  it("negative steuerbasis (loss) → positive steuerMonat (benefit)", () => {
    const s = baseState();
    // Large AfA pushes the taxable base well below zero.
    s.gebaeudewert = 400000;
    s.afaSatz = 3.0; // afaJahr = 12000
    const c = calc(s);
    expect(c.steuerbasisJ).toBeLessThan(0);
    expect(c.steuerMonat).toBeGreaterThan(0);
  });

  it("positive steuerbasis (profit) → negative steuerMonat (owed)", () => {
    const s = baseState();
    // No depreciation, high cash rent, no loan interest → taxable profit.
    s.gebaeudewert = 0;
    s.financing = { ...s.financing, ek: 10_000_000 }; // loan 0 → zinsMonat 0
    s.deal = { ...s.deal, rent: 2000 };
    const c = calc(s);
    expect(c.steuerbasisJ).toBeGreaterThan(0);
    expect(c.steuerMonat).toBeLessThan(0);
  });
});

describe("calc — Grunderwerb rate parameter", () => {
  it("defaults to 0.055 (Sachsen)", () => {
    expect(DEFAULT_GRUNDERWERB_RATE).toBe(0.055);
    const c = calc(baseState());
    expect(c.grunderwerb).toBeCloseTo(200000 * 0.055, 6);
  });

  it("honours a Bundesland-specific override (e.g. 6.5 % NRW)", () => {
    const c = calc(baseState(), { grunderwerbRate: 0.065 });
    expect(c.grunderwerb).toBeCloseTo(200000 * 0.065, 6);
    expect(c.NK).toBeCloseTo(13000 + 3200 + 7140, 6);
  });
});
