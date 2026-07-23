/**
 * Mock deal store, seeded from the design prototype
 * (handoff/design_handoff_dealpilot/DealPilot.dc.html → pipeline `mk({...})`
 * rows and the default `state` object).
 *
 * IMPORTANT: nothing about the *displayed* score, colour, yield or price is
 * hard-coded here. Each deal is stored as a full `DealState` (the same shape
 * @dealpilot/core consumes) with the underlying numeric inputs. The pipeline
 * derivation layer (src/lib/pipeline.ts) runs every deal through core's
 * `calc()` (yield), `computeScore()` (score + Ampel colour) and the `format*`
 * helpers (price/percent), so the numbers the UI shows are genuinely computed.
 *
 * The risk arrays below are chosen so that core's prototype score heuristic
 * — scoreVal = clamp(round(74 + resolvedN*2 - totalCovered/1500), 40, 95) —
 * reproduces the exact scores from the screenshot (78 / 61 / 45 / 84), and so
 * that the number of *open* risks matches the "N Risiken" counts (2 / 3 / 1 / 0).
 * The chosen rents make core's gross yield land on the design's values
 * (4,2 % / 5,1 % / 3,1 % / 4,6 %).
 */

import type {
  Collaborator,
  Contact,
  Deal,
  DealState,
  Risk,
} from '@dealpilot/core';

/** A pipeline entry: a deal id plus its full core state. */
export interface SeedDeal {
  id: string;
  state: DealState;
  /**
   * Discarded ("verworfen") deals show a free-text reason instead of the
   * standard `Ort · m² · Baujahr · Status` subtitle (see prototype Ringstraße).
   */
  discardNote?: string;
  /**
   * Display-only occupancy label override. core's `VermietetStatus` only models
   * vermietet / nicht_vermietet; an MFH can be partially let ("teilverm."),
   * which the enum can't express — so the subtitle word (master-data display,
   * not a computed metric) may be overridden here.
   */
  statusLabel?: string;
}

// --- Shared defaults (from the prototype's default `state`) -----------------

const OWNER: Collaborator = {
  id: 1,
  name: 'Niklas (du)',
  email: 'niklas@tano.care',
  role: 'owner',
  pending: false,
};

const DEFAULT_CONTACT: Contact = {
  name: 'Martina Krause',
  role: 'Maklerin · Stadthaus Immobilien',
  hasPhoto: false,
};

/** Risk-array builders (status → appliedCost follows the core state machine). */
function openRisk(
  id: string,
  severity: Risk['severity'],
  title: string,
  estimate: number,
): Risk {
  return {
    id,
    title,
    description: '',
    severity,
    estimate,
    status: 'open',
    appliedCost: 0,
  };
}

function acceptedRisk(id: string, title: string): Risk {
  return {
    id,
    title,
    description: '',
    severity: 'a',
    estimate: 0,
    status: 'accepted',
    appliedCost: 0,
  };
}

function coveredRisk(
  id: string,
  severity: Risk['severity'],
  title: string,
  cost: number,
): Risk {
  return {
    id,
    title,
    description: '',
    severity,
    estimate: cost,
    status: 'covered',
    appliedCost: cost,
  };
}

/**
 * Build a full DealState from the master data + overrides, filling every
 * financing/cost/tax field with the prototype defaults so `calc()` runs
 * against realistic inputs.
 */
function makeState(
  deal: Deal,
  opts: {
    risks?: Risk[];
    collaborators?: Collaborator[];
  } = {},
): DealState {
  return {
    deal,
    priceByCase: {
      base: deal.kaufpreis,
      bull: deal.kaufpreis,
      bear: deal.kaufpreis,
    },
    scenario: 'base',
    financing: { zins: 3.8, tilg: 2.0, ek: 90000, maklerPct: 0.0357 },
    costs: { hausgeld: 115, ruecklage: 60, verwaltung: 30 },
    costGrowth: 2.0,
    wertZuwachs: 2.0,
    steig: 2.3,
    gebaeudewert: 132000,
    afaSatz: 2.0,
    steuersatz: 42,
    measures: [],
    risks: opts.risks ?? [],
    collaborators: opts.collaborators ?? [OWNER],
    contact: DEFAULT_CONTACT,
  };
}

// --- The seeded pipeline ----------------------------------------------------

export const SEED_DEALS: SeedDeal[] = [
  // In Prüfung — score 78 (green), yield 4,2 %, 2 open risks, shared with Lena.
  {
    id: 'lindenstrasse-14',
    state: makeState(
      {
        objektart: 'ETW',
        address: 'Lindenstraße 14',
        ort: 'Leipzig',
        qm: 68,
        baujahr: 1998,
        kaufpreis: 189000,
        rent: 662, // → gross yield 4,2 %
        vermietet: 'vermietet',
        dealStatus: 'pruefung',
      },
      {
        // resolvedN = 2 accepted, totalCovered = 0 → score 74 + 4 = 78.
        // 2 open risks → "2 Risiken".
        risks: [
          openRisk('dach', 'r', 'Marodes Dach – Sanierung vertagt', 2600),
          openRisk('verzug', 'r', '2 Eigentümer in Zahlungsverzug', 800),
          acceptedRisk('teilung', 'Sondernutzung Garten geklärt'),
          acceptedRisk('grundbuch', 'Grundbuch unauffällig'),
        ],
        collaborators: [
          OWNER,
          {
            id: 2,
            name: 'Lena Weber',
            email: 'lena.weber@gmail.com',
            role: 'edit',
            pending: false,
          },
        ],
      },
    ),
  },

  // In Prüfung — score 61 (yellow), yield 5,1 %, 3 open risks.
  {
    id: 'gartenweg-3',
    state: makeState(
      {
        objektart: 'MFH',
        address: 'Gartenweg 3',
        ort: 'Halle',
        qm: 240,
        baujahr: 1965,
        kaufpreis: 420000,
        rent: 1785, // → gross yield 5,1 %
        vermietet: 'vermietet',
        dealStatus: 'pruefung',
      },
      {
        // resolvedN = 3 covered, totalCovered = 28.500 → 74 + 6 − 19 = 61.
        // 3 open risks → "3 Risiken".
        risks: [
          coveredRisk('heizung', 'r', 'Heizungsanlage am Lebensende', 12000),
          coveredRisk('elektrik', 'r', 'Elektrik nicht normgerecht', 9500),
          coveredRisk('fassade', 'a', 'Fassade rissig', 7000),
          openRisk('leerstand', 'a', 'Teilleerstand 2 Einheiten', 4000),
          openRisk('ruecklage', 'a', 'Instandhaltungsrücklage knapp', 0),
          openRisk('mietspiegel', 'a', 'Mieten über Mietspiegel', 0),
        ],
      },
    ),
    statusLabel: 'teilverm.', // MFH partially let — not expressible via core's enum.
  },

  // Neu — score 45 (red), yield 3,1 %, 1 open risk.
  {
    id: 'kaiserallee-22',
    state: makeState(
      {
        objektart: 'ETW',
        address: 'Kaiserallee 22',
        ort: 'Leipzig',
        qm: 54,
        baujahr: 2012,
        kaufpreis: 245000,
        rent: 633, // → gross yield 3,1 %
        vermietet: 'nicht_vermietet',
        dealStatus: 'neu',
      },
      {
        // resolvedN = 1 covered, totalCovered = 46.500 → 74 + 2 − 31 = 45.
        // 1 open risk → "1 Risiko".
        risks: [
          coveredRisk('sanierung', 'r', 'Kernsanierung erforderlich', 46500),
          openRisk('bebauung', 'r', 'Bebauungsplan-Änderung geplant', 0),
        ],
      },
    ),
  },

  // Verhandlung — score 84 (green), yield 4,6 %, 0 open risks.
  {
    id: 'suedplatz-7',
    state: makeState(
      {
        objektart: 'ETW',
        address: 'Südplatz 7',
        ort: 'Leipzig',
        qm: 82,
        baujahr: 2005,
        kaufpreis: 312000,
        rent: 1196, // → gross yield 4,6 %
        vermietet: 'vermietet',
        dealStatus: 'verhandlung',
      },
      {
        // resolvedN = 5 accepted, totalCovered = 0 → 74 + 10 = 84. 0 open risks.
        risks: [
          acceptedRisk('r1', 'Grundbuch geprüft'),
          acceptedRisk('r2', 'Teilungserklärung geprüft'),
          acceptedRisk('r3', 'Rücklage ausreichend'),
          acceptedRisk('r4', 'Energieausweis vorhanden'),
          acceptedRisk('r5', 'Protokolle unauffällig'),
        ],
      },
    ),
  },

  // Verworfen — no score, gray rail, discard note instead of subtitle.
  {
    id: 'ringstrasse-40',
    state: makeState({
      objektart: 'ETW',
      address: 'Ringstraße 40',
      ort: 'Dresden',
      qm: 61,
      baujahr: 1978,
      kaufpreis: 205000,
      rent: 720,
      vermietet: 'vermietet',
      dealStatus: 'verworfen',
    }),
    discardNote: 'Erbpacht + Sonderumlage',
  },
];
