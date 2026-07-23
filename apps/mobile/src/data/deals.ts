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

import {
  suggestedAfaSatz,
  type Collaborator,
  type Contact,
  type Costs,
  type Deal,
  type DealState,
  type Financing,
  type Objektart,
  type PriceByCase,
  type Risk,
  type VermietetStatus,
} from '@dealpilot/core';

/**
 * Static, per-deal analyst sub-scores for the Score-Zerlegung bars (0…100).
 * These are mock "expert" inputs (Rendite / Lage & Markt / Objekt & WEG); the
 * fourth bar (Doku-Risiken) is NOT stored here — it is derived live from core's
 * `computeScore().dokuVal`. Colour per bar is derived from the value, so nothing
 * about the bar colours is hard-coded (see src/lib/detail.ts).
 */
export interface ScoreBreakdown {
  /** Yield sub-score. */
  rendite: number;
  /** Location & market sub-score. */
  lage: number;
  /** Building & HOA sub-score. */
  objekt: number;
}

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
  /**
   * Plausible static German KI verdict (2–3 sentences) shown in the dark
   * KI-Urteil card on the Übersicht tab. Static mock content, not computed.
   */
  verdict: string;
  /** Static analyst sub-scores feeding the Score-Zerlegung bars. */
  scoreBreakdown: ScoreBreakdown;
  /**
   * Monotonic creation order (for the "Datum" pipeline sort). Seeded deals get
   * their array index; deals created at runtime get a higher value so they sort
   * as the newest. Optional so the seed literals below stay terse (the store
   * fills it in from the array index when absent).
   */
  createdSeq?: number;
}

/** Input collected by the "Deal anlegen" overlay (README 4). */
export interface CreateDealInput {
  objektart: Objektart;
  /** Straße & Nr. — optional ("falls bekannt"). */
  address?: string;
  /** PLZ — optional. */
  plz?: string;
  ort: string;
  vermietet: VermietetStatus;
  kaufpreis: number;
  /** Wohnfläche in m². */
  qm: number;
  /** Kaltmiete/Monat (EUR) — optional (0 if unknown). */
  rent: number;
}

/**
 * Default Baujahr for a manually-created deal. The create form (README 4)
 * deliberately does NOT ask for the construction year, so we seed a neutral
 * placeholder the user corrects later in the Objektdaten sheet. 1990 lands in
 * the common "ab 1925" band → suggestedAfaSatz(1990) = 2,0 %.
 */
export const NEW_DEAL_BAUJAHR = 1990;

/**
 * Build a complete, valid `DealState` from the manual create form, filling
 * every financing/cost/tax field with the prototype defaults so `calc()` and
 * `computeScore()` run against realistic inputs from the first render:
 *  - priceByCase seeded to the entered Kaufpreis for all three scenarios,
 *  - financing/costs = the shared prototype defaults,
 *  - gebaeudewert ≈ 70 % of the price (a plausible Kaufpreisaufteilung; only
 *    the building is depreciable), afaSatz via `suggestedAfaSatz(baujahr)`,
 *  - no risks (→ score 74 / green), no measures, just the owner as collaborator.
 */
export function createDealState(input: CreateDealInput): DealState {
  const baujahr = NEW_DEAL_BAUJAHR;
  // Guard the free-text numeric inputs so a NaN (e.g. from an empty field) never
  // enters DealState / priceByCase and cascades into calc / score / sorting.
  const price = coerceNonNeg(input.kaufpreis);
  const address = input.address?.trim();
  const plz = input.plz?.trim();
  const deal: Deal = {
    objektart: input.objektart,
    address: address ? address : undefined,
    plz: plz ? plz : undefined,
    ort: input.ort.trim(),
    qm: coerceNonNeg(input.qm),
    baujahr,
    kaufpreis: price,
    rent: coerceNonNeg(input.rent),
    vermietet: input.vermietet,
    dealStatus: 'neu',
  };
  return {
    deal,
    priceByCase: uniformPriceByCase(price),
    scenario: 'base',
    financing: { ...DEFAULT_FINANCING },
    costs: { ...DEFAULT_COSTS },
    costGrowth: DEFAULT_COST_GROWTH,
    wertZuwachs: DEFAULT_WERT_ZUWACHS,
    steig: DEFAULT_STEIG,
    gebaeudewert: Math.round(price * 0.7),
    afaSatz: suggestedAfaSatz(baujahr),
    steuersatz: DEFAULT_STEUERSATZ,
    measures: [],
    risks: [],
    collaborators: [{ ...OWNER }],
    contact: {
      name: 'Ansprechpartner',
      role: 'Noch nicht hinterlegt',
      hasPhoto: false,
    },
  };
}

/** Wrap a fresh `DealState` in a SeedDeal with placeholder verdict / sub-scores. */
export function createSeedDeal(
  id: string,
  input: CreateDealInput,
  createdSeq: number,
): SeedDeal {
  return {
    id,
    state: createDealState(input),
    verdict:
      'Neu angelegter Deal. Lade Unterlagen hoch oder ergänze die Objektdaten, ' +
      'damit die KI Kennzahlen prüfen und Risiken finden kann.',
    scoreBreakdown: { rendite: 60, lage: 60, objekt: 55 },
    createdSeq,
  };
}

// --- Shared defaults (from the prototype's default `state`) -----------------

/**
 * Prototype financing defaults (Sollzins / Tilgung / Eigenkapital / Makler).
 * Shared by `createDealState` and `makeState` so the two never drift apart.
 */
export const DEFAULT_FINANCING: Financing = {
  zins: 3.8,
  tilg: 2.0,
  ek: 90000,
  maklerPct: 0.0357,
};

/** Prototype laufende-Kosten defaults (Hausgeld / Rücklage / Verwaltung, €/Mo). */
export const DEFAULT_COSTS: Costs = { hausgeld: 115, ruecklage: 60, verwaltung: 30 };

/** Prototype growth / tax assumptions (percent). */
export const DEFAULT_COST_GROWTH = 2.0;
export const DEFAULT_WERT_ZUWACHS = 2.0;
export const DEFAULT_STEIG = 2.3;
export const DEFAULT_STEUERSATZ = 42;

/**
 * Coerce a user-supplied numeric input to a finite, non-negative number,
 * falling back to `fallback` (default 0) for NaN / Infinity / negatives. Keeps
 * a stray NaN (e.g. from `Number('')`) out of `DealState` / `priceByCase`,
 * where it would otherwise cascade into calc / score and corrupt sorting.
 */
export function coerceNonNeg(x: number, fallback = 0): number {
  return Number.isFinite(x) && x >= 0 ? x : fallback;
}

/** The `{ base, bull, bear }` triple all seeded to the same price. */
export function uniformPriceByCase(price: number): PriceByCase {
  return { base: price, bull: price, bear: price };
}

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
  phone: '+49 341 5550123',
  email: 'krause@stadthaus-immobilien.de',
  hasPhoto: false,
};

/**
 * Extra source-backed detail a risk can carry (all optional). Split out so the
 * builders below stay readable while still letting each seeded risk supply the
 * verbatim quote / Fundstelle / context the Risiko-Detail screen renders.
 */
interface RiskExtras {
  description?: string;
  /** Verbatim quote proving the finding ("Fundstelle"). */
  quote?: string;
  /** Human-readable source reference (document · page · section). */
  source?: string;
  /** Total WEG-wide figure, if known (EUR). */
  gesamt?: number;
  /** Whether this is a "big" risk (offers the surveyor affiliate CTA). */
  big?: boolean;
  /** Free-text context captured in the wizard's context dialog. */
  context?: string;
  /** Optional surveyor attached during resolution. */
  surveyor?: string | null;
}

/** Risk-array builders (status → appliedCost follows the core state machine). */
function openRisk(
  id: string,
  severity: Risk['severity'],
  title: string,
  estimate: number,
  extras: RiskExtras = {},
): Risk {
  return {
    id,
    title,
    description: extras.description ?? '',
    severity,
    estimate,
    status: 'open',
    appliedCost: 0,
    ...extras,
  };
}

function acceptedRisk(id: string, title: string, extras: RiskExtras = {}): Risk {
  return {
    id,
    title,
    description: extras.description ?? '',
    severity: 'a',
    estimate: 0,
    status: 'accepted',
    appliedCost: 0,
    ...extras,
  };
}

function coveredRisk(
  id: string,
  severity: Risk['severity'],
  title: string,
  cost: number,
  extras: RiskExtras = {},
): Risk {
  return {
    id,
    title,
    description: extras.description ?? '',
    severity,
    estimate: cost,
    status: 'covered',
    appliedCost: cost,
    ...extras,
  };
}

/**
 * A risk parked as an open question to the seller ("Frage an Verkäufer offen").
 * Resolved for scoring purposes (status ≠ open) but contributes 0 to GIK.
 */
function questionRisk(
  id: string,
  severity: Risk['severity'],
  title: string,
  extras: RiskExtras = {},
): Risk {
  return {
    id,
    title,
    description: extras.description ?? '',
    severity,
    estimate: 0,
    status: 'question',
    appliedCost: 0,
    ...extras,
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
    priceByCase: uniformPriceByCase(deal.kaufpreis),
    scenario: 'base',
    financing: { ...DEFAULT_FINANCING },
    costs: { ...DEFAULT_COSTS },
    costGrowth: DEFAULT_COST_GROWTH,
    wertZuwachs: DEFAULT_WERT_ZUWACHS,
    steig: DEFAULT_STEIG,
    gebaeudewert: 132000,
    afaSatz: 2.0,
    steuersatz: DEFAULT_STEUERSATZ,
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
          openRisk('dach', 'r', 'Marodes Dach – Sanierung vertagt', 2600, {
            description:
              'Die Eigentümerversammlung hat die notwendige Dachsanierung erneut vertagt. Eine Sonderumlage ist in den nächsten 2–3 Jahren sehr wahrscheinlich; dein Anteil richtet sich nach den Miteigentumsanteilen (MEA 82/1000).',
            quote:
              '„TOP 7 – Antrag Dachsanierung: Die Versammlung beschließt mehrheitlich, die Sanierung auf die nächste ordentliche ETV zu vertagen. Angebot liegt bei ca. 118.000 € (Gesamt-WEG)."',
            source: 'ETV-Protokoll 2025 · Seite 3 · TOP 7',
            gesamt: 118000,
            big: true,
          }),
          openRisk('verzug', 'r', '2 Eigentümer in Zahlungsverzug', 800, {
            description:
              'Zwei Einheiten sind mit dem Hausgeld im Rückstand. Das erhöht das Risiko einer Nachschusspflicht der übrigen Eigentümer.',
            quote:
              '„TOP 4 – Der Verwalter berichtet über Hausgeldrückstände zweier Einheiten in Höhe von insgesamt ~9.600 €."',
            source: 'ETV-Protokoll 2025 · Seite 4 · TOP 4',
            gesamt: 9600,
          }),
          acceptedRisk('teilung', 'Sondernutzung Garten geklärt', {
            description:
              'Die Zuordnung des Gartens als Sondernutzungsrecht war zunächst unklar, ist inzwischen aber belegt.',
            context:
              'Verkäufer hat den Nachtrag zur Teilungserklärung geschickt: Das Sondernutzungsrecht am Garten ist der Einheit fest zugeordnet und im Grundbuch (Abt. II) eingetragen.',
          }),
          acceptedRisk('grundbuch', 'Grundbuch unauffällig', {
            description:
              'Der aktuelle Grundbuchauszug zeigt keine belastenden Eintragungen in Abteilung II oder III außer der finanzierenden Grundschuld.',
          }),
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
    verdict:
      'Solide Cashflow-Wohnung in gefragter Leipziger Lage. Die Rendite trägt sich, aber ein vertagter Dachbeschluss drückt den Score — vor Kauf klären. Der Preis wirkt verhandelbar.',
    scoreBreakdown: { rendite: 82, lage: 88, objekt: 54 },
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
          coveredRisk('heizung', 'r', 'Heizungsanlage am Lebensende', 12000, {
            description:
              'Die zentrale Gasheizung ist Baujahr 1998 und laut Gutachter am Ende der Nutzungsdauer. Ein Austausch inkl. hydraulischem Abgleich ist mittelfristig unvermeidbar.',
            quote:
              '„Wärmeerzeuger (Bj. 1998) technisch verschlissen; Austausch innerhalb der nächsten 2 Jahre empfohlen. Kostenrahmen 22.000–26.000 € (Gesamt-WEG)."',
            source: 'Sachverständigen-Gutachten Heizung · Seite 4',
            gesamt: 24000,
            big: true,
            surveyor: 'J. Berger (Sachverständiger)',
            context:
              'Gutachten liegt vor; angesetzter Anteil entspricht der auf die Einheit entfallenden Umlage.',
          }),
          coveredRisk('elektrik', 'r', 'Elektrik nicht normgerecht', 9500, {
            description:
              'Die Elektroinstallation entspricht in Teilen nicht mehr der aktuellen Norm (keine FI-Schutzschalter in allen Stromkreisen).',
            quote:
              '„E-Check: In 3 von 6 Einheiten fehlen RCD/FI-Schutzeinrichtungen; Nachrüstung erforderlich."',
            source: 'E-Check-Bericht 2024 · Seite 2',
            gesamt: 19000,
            big: true,
          }),
          coveredRisk('fassade', 'a', 'Fassade rissig', 7000, {
            description:
              'Der Wirtschaftsplan nennt eine geplante Sonderumlage für die Fassadeninstandsetzung.',
            quote:
              '„Für die anstehende Fassadeninstandsetzung ist eine Sonderumlage vorgesehen."',
            source: 'Wirtschaftsplan 2025 · Seite 2',
            gesamt: 54000,
          }),
          openRisk('leerstand', 'a', 'Teilleerstand 2 Einheiten', 4000, {
            description:
              'Zwei der sechs Einheiten stehen aktuell leer. Mietausfall bis zur Neuvermietung ist einzuplanen, bietet aber Mietsteigerungs-Potenzial.',
            quote:
              '„Einheiten 3 und 5 sind zum Stichtag nicht vermietet (Leerstand seit 4 bzw. 7 Monaten)."',
            source: 'Mieterliste · Stand 03/2025',
            big: true,
          }),
          openRisk('ruecklage', 'a', 'Instandhaltungsrücklage knapp', 0, {
            description:
              'Die Instandhaltungsrücklage ist im Verhältnis zum Objekt eher niedrig.',
            quote: '„Stand Instandhaltungsrücklage zum 31.12.: 42.000 €."',
            source: 'Wirtschaftsplan 2025 · Seite 1',
          }),
          openRisk('mietspiegel', 'a', 'Mieten über Mietspiegel', 0, {
            description:
              'Einzelne Bestandsmieten liegen oberhalb des örtlichen Mietspiegels; bei Neuvermietung droht eine Absenkung.',
          }),
        ],
      },
    ),
    statusLabel: 'teilverm.', // MFH partially let — not expressible via core's enum.
    verdict:
      'Renditestarkes Mehrfamilienhaus, aber mit Substanz-Themen: Heizung und Elektrik sind bereits einkalkuliert. Der Teilleerstand bietet Mietsteigerungs-Potenzial, drückt aktuell aber den laufenden Cashflow.',
    scoreBreakdown: { rendite: 88, lage: 58, objekt: 44 },
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
          coveredRisk('sanierung', 'r', 'Kernsanierung erforderlich', 46500, {
            description:
              'Das Bewertungsgutachten stuft die Wohnung als kernsanierungsbedürftig ein (Bäder, Leitungen, Bodenbeläge). Der Betrag ist bereits vollständig in die Kalkulation übernommen.',
            quote:
              '„Objektzustand: einfach. Für eine marktgängige Vermietung ist eine Kernsanierung (Bäder, Elektro, Bodenbeläge) mit ~46.500 € zu veranschlagen."',
            source: 'Wertgutachten 2025 · Seite 6',
            gesamt: 46500,
            big: true,
          }),
          openRisk('bebauung', 'r', 'Bebauungsplan-Änderung geplant', 0, {
            description:
              'Die Stadt plant eine Änderung des Bebauungsplans für das Nachbargrundstück; Auswirkungen auf Belichtung und Lärm sind noch offen.',
            quote:
              '„Aufstellungsbeschluss B-Plan Nr. 214: Nachverdichtung mit bis zu 5 Geschossen vorgesehen."',
            source: 'Amtsblatt · Bekanntmachung 04/2025',
          }),
        ],
      },
    ),
    verdict:
      'Neuwertige Wohnung in guter Lage, aber teuer eingekauft: Die Kernsanierung des Nachbarblocks und der niedrige Anfangsmietzins drücken die Rendite deutlich unter Marktniveau. Nur bei spürbarem Preisnachlass interessant.',
    scoreBreakdown: { rendite: 38, lage: 74, objekt: 46 },
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
        // resolvedN = 5 resolved (4 accepted + 1 question), totalCovered = 0
        // → 74 + 10 = 84. 0 open risks (a question is resolved, not open).
        risks: [
          acceptedRisk('r1', 'Grundbuch geprüft'),
          acceptedRisk('r2', 'Teilungserklärung geprüft'),
          acceptedRisk('r3', 'Rücklage ausreichend'),
          acceptedRisk('r4', 'Energieausweis vorhanden'),
          questionRisk('r5', 'a', 'Wohnflächen-Abweichung geklärt?', {
            description:
              'Die im Exposé genannte Wohnfläche weicht rechnerisch leicht von der Teilungserklärung ab. Wir haben den Verkäufer um eine verbindliche Aufmaß-Bestätigung gebeten.',
            quote:
              '„Wohnfläche lt. Exposé 82 m²; lt. Teilungserklärung 79,6 m²."',
            source: 'Exposé · Teilungserklärung · Vergleich',
          }),
        ],
      },
    ),
    verdict:
      'Sehr saubere Akte: alle Prüfpunkte abgehakt, Rücklage ausreichend, keine offenen Risiken. Rendite und Lage passen — ein Deal mit geringem Überraschungspotenzial, der sich für die Verhandlung anbietet.',
    scoreBreakdown: { rendite: 78, lage: 90, objekt: 86 },
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
    verdict:
      'Verworfen: Das Objekt steht auf Erbpacht, und eine hohe Sonderumlage für die Tiefgarage steht unmittelbar bevor. Beides zusammen macht die Kalkulation unattraktiv — als Referenz archiviert.',
    scoreBreakdown: { rendite: 40, lage: 62, objekt: 30 },
  },
];
