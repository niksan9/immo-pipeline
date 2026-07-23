import type { DealState, Risk } from "../src/index.js";

/**
 * A clean, hand-computable base state used across tests.
 * Numbers are chosen so the worked example in calc.test.ts stays tractable.
 */
export function baseState(): DealState {
  return {
    deal: {
      objektart: "ETW",
      address: "Musterstraße 1",
      plz: "04109",
      ort: "Leipzig",
      qm: 70,
      baujahr: 1998,
      kaufpreis: 200000,
      rent: 1000,
      vermietet: "vermietet",
      dealStatus: "pruefung",
    },
    priceByCase: { base: 200000, bull: 200000, bear: 200000 },
    scenario: "base",
    financing: { zins: 4.0, tilg: 2.0, ek: 50000, maklerPct: 0.0357 },
    costs: { hausgeld: 100, ruecklage: 50, verwaltung: 30 },
    costGrowth: 2.0,
    wertZuwachs: 2.0,
    steig: 2.0,
    gebaeudewert: 150000,
    afaSatz: 2.0,
    steuersatz: 42,
    measures: [],
    risks: [],
    collaborators: [],
    contact: { name: "Martina Krause", role: "Maklerin" },
  };
}

/** Factory for a risk with sensible defaults. */
export function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: "r1",
    title: "Test risk",
    description: "desc",
    severity: "r",
    estimate: 3000,
    status: "open",
    appliedCost: 0,
    ...overrides,
  };
}
