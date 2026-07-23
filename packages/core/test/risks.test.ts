import { describe, it, expect } from "vitest";
import {
  transitionRisk,
  isValidTransition,
  coverRisk,
  acceptRisk,
  questionRisk,
  reopenRisk,
  applyContextProposal,
  InvalidRiskTransitionError,
  type RiskStatus,
} from "../src/index.js";
import { makeRisk } from "./fixtures.js";

const ALL: RiskStatus[] = ["open", "covered", "accepted", "question"];

describe("isValidTransition — full matrix", () => {
  it("only open→open is invalid; every other pair is valid", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const expected = !(to === "open" && from === "open");
        expect(isValidTransition(from, to)).toBe(expected);
      }
    }
  });
});

describe("transitionRisk — valid transitions from open", () => {
  it("open → covered sets appliedCost = estimate", () => {
    const r = transitionRisk(makeRisk({ status: "open", estimate: 2600 }), "covered");
    expect(r.status).toBe("covered");
    expect(r.appliedCost).toBe(2600);
  });

  it("open → accepted sets appliedCost = 0", () => {
    const r = transitionRisk(makeRisk({ status: "open", estimate: 2600 }), "accepted");
    expect(r.status).toBe("accepted");
    expect(r.appliedCost).toBe(0);
  });

  it("open → question sets appliedCost = 0", () => {
    const r = transitionRisk(makeRisk({ status: "open", estimate: 2600 }), "question");
    expect(r.status).toBe("question");
    expect(r.appliedCost).toBe(0);
  });
});

describe("transitionRisk — reopen and update from resolved states", () => {
  it("resolved → open clears appliedCost (reopen)", () => {
    for (const from of ["covered", "accepted", "question"] as RiskStatus[]) {
      const r = transitionRisk(
        makeRisk({ status: from, appliedCost: 2600 }),
        "open",
      );
      expect(r.status).toBe("open");
      expect(r.appliedCost).toBe(0);
    }
  });

  it("covered → accepted (wizard update) recomputes appliedCost", () => {
    const r = transitionRisk(
      makeRisk({ status: "covered", estimate: 2600, appliedCost: 2600 }),
      "accepted",
    );
    expect(r.status).toBe("accepted");
    expect(r.appliedCost).toBe(0);
  });

  it("accepted → covered (wizard update) sets appliedCost = estimate", () => {
    const r = transitionRisk(
      makeRisk({ status: "accepted", estimate: 1200, appliedCost: 0 }),
      "covered",
    );
    expect(r.status).toBe("covered");
    expect(r.appliedCost).toBe(1200);
  });
});

describe("transitionRisk — invalid transitions throw", () => {
  it("open → open throws InvalidRiskTransitionError", () => {
    expect(() => transitionRisk(makeRisk({ status: "open" }), "open")).toThrow(
      InvalidRiskTransitionError,
    );
  });

  it("reopenRisk on an already-open risk throws", () => {
    expect(() => reopenRisk(makeRisk({ status: "open" }))).toThrow(
      InvalidRiskTransitionError,
    );
  });

  it("error carries from/to", () => {
    try {
      transitionRisk(makeRisk({ status: "open" }), "open");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidRiskTransitionError);
      const err = e as InvalidRiskTransitionError;
      expect(err.from).toBe("open");
      expect(err.to).toBe("open");
    }
  });
});

describe("named wrappers", () => {
  it("coverRisk / acceptRisk / questionRisk", () => {
    expect(coverRisk(makeRisk({ estimate: 500 })).appliedCost).toBe(500);
    expect(acceptRisk(makeRisk({ estimate: 500 })).appliedCost).toBe(0);
    expect(questionRisk(makeRisk({ estimate: 500 })).status).toBe("question");
  });

  it("does not mutate the input risk", () => {
    const input = makeRisk({ status: "open", estimate: 700, appliedCost: 0 });
    const out = coverRisk(input);
    expect(input.status).toBe("open");
    expect(input.appliedCost).toBe(0);
    expect(out).not.toBe(input);
  });
});

describe("applyContextProposal", () => {
  it("applies a reduced covered cost with context note", () => {
    const r = applyContextProposal(makeRisk({ status: "open", estimate: 2600 }), {
      status: "covered",
      cost: 1300,
      note: "Verkäufer beteiligt sich zur Hälfte",
    });
    expect(r.status).toBe("covered");
    expect(r.appliedCost).toBe(1300); // overrides estimate
    expect(r.context).toBe("Verkäufer beteiligt sich zur Hälfte");
  });

  it("applies 'Kosten entfallen' as accepted with 0 and attaches surveyor", () => {
    const r = applyContextProposal(makeRisk({ status: "open", estimate: 2600 }), {
      status: "accepted",
      cost: 0,
      note: "Gutachten: Dach trocken",
      surveyor: "Ing. Bauer",
    });
    expect(r.status).toBe("accepted");
    expect(r.appliedCost).toBe(0);
    expect(r.surveyor).toBe("Ing. Bauer");
  });

  it("can be applied to a resolved risk (update), staying immutable", () => {
    const input = makeRisk({ status: "covered", estimate: 2600, appliedCost: 2600 });
    const out = applyContextProposal(input, { status: "accepted", cost: 0 });
    expect(out.status).toBe("accepted");
    expect(out.appliedCost).toBe(0);
    expect(input.status).toBe("covered");
  });
});
