/**
 * DealPilot core domain model.
 *
 * Mirrors the state shape described in the design handoff
 * ("State Management" / "Eingaben (State)") and the `class Component`
 * state in DealPilot.dc.html. All monetary amounts are floats in EUR;
 * rounding happens only at display time (see src/format.ts). Percentages
 * are stored as human-readable numbers (3.8 means 3.8 %), not decimals —
 * the one exception is `maklerPct`, which is a decimal fraction (0.0357),
 * matching the prototype.
 */

/** Property type. */
export type Objektart = "ETW" | "MFH" | "Haus";

/** Whether the unit is currently let. */
export type VermietetStatus = "vermietet" | "nicht_vermietet";

/** Where the deal sits in the user's pipeline. */
export type DealStatus =
  | "neu"
  | "pruefung"
  | "verhandlung"
  | "gekauft"
  | "verworfen";

/** Pricing scenario. */
export type Scenario = "base" | "bull" | "bear";

/** Object master data. */
export interface Deal {
  objektart: Objektart;
  /** Street + number, optional ("falls bekannt"). */
  address?: string;
  /** PLZ, optional. */
  plz?: string;
  ort: string;
  /** Wohnfläche in m². */
  qm: number;
  baujahr: number;
  /** Asking / current price of the offer (EUR). */
  kaufpreis: number;
  /** Kaltmiete per month (EUR). */
  rent: number;
  vermietet: VermietetStatus;
  dealStatus: DealStatus;
}

/** Separately editable price per scenario (EUR). */
export interface PriceByCase {
  base: number;
  bull: number;
  bear: number;
}

/** Financing assumptions. */
export interface Financing {
  /** Sollzins % p.a. */
  zins: number;
  /** Anfängliche Tilgung % p.a. */
  tilg: number;
  /** Eigenkapital (EUR), free 0…GIK (capped in calc). */
  ek: number;
  /** Makler commission as a decimal fraction (e.g. 0.0357). */
  maklerPct: number;
}

/** Non-apportionable running costs (EUR / month). */
export interface Costs {
  hausgeld: number;
  ruecklage: number;
  verwaltung: number;
}

/** A value-add measure: one-off invest in `year`, permanent monthly uplift after. */
export interface Measure {
  id?: string | number;
  title?: string;
  /** Year (1-based) the invest happens and the uplift starts. */
  year: number;
  /** One-off investment (EUR). */
  invest: number;
  /** Permanent monthly rent uplift (EUR/month) from `year` onward. */
  uplift: number;
}

/** Risk lifecycle status. Only `covered` feeds `appliedCost` into GIK. */
export type RiskStatus = "open" | "covered" | "accepted" | "question";

/** Ampel tone used for the open-risk shorthand (KRIT vs. HINW). */
export type RiskTone = "r" | "a";

/** A detected risk with a source-backed quote. */
export interface Risk {
  id: string;
  title: string;
  description: string;
  /** Ampel severity tone ("r" critical / "a" hint). */
  severity: RiskTone;
  /** KI cost estimate (EUR) — what it would cost if taken into account. */
  estimate: number;
  status: RiskStatus;
  /** Cost actually flowing into GIK. Non-zero only when status === "covered". */
  appliedCost: number;
  /** Verbatim quote proving the finding ("Fundstelle"). */
  quote?: string;
  /** Human-readable source reference (document · page · section). */
  source?: string;
  /** Total WEG-wide figure, if known (EUR). */
  gesamt?: number;
  /** Whether this is a "big" risk (offers surveyor affiliate CTA). */
  big?: boolean;
  /** Free-text context captured in the wizard's context dialog. */
  context?: string;
  /** Optional surveyor attached during resolution. */
  surveyor?: string | null;
}

/** Collaborator with access to the deal. */
export interface Collaborator {
  id: string | number;
  name: string;
  email: string;
  role: "owner" | "edit" | "view";
  pending: boolean;
}

/** Point of contact (broker / seller). */
export interface Contact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  hasPhoto?: boolean;
}

/**
 * The full deal state. Every metric is a pure function of this object
 * (see calc.ts / schedule.ts / score.ts) so the UI can recompute live.
 * Chats are intentionally kept out of core for now.
 */
export interface DealState {
  deal: Deal;
  priceByCase: PriceByCase;
  scenario: Scenario;
  financing: Financing;
  costs: Costs;
  /** Cost growth % p.a. */
  costGrowth: number;
  /** Property appreciation % p.a. */
  wertZuwachs: number;
  /** Rent increase % p.a. (Mietsteigerung). */
  steig: number;
  /** Building value excl. land (EUR) — only this is depreciable. */
  gebaeudewert: number;
  /** Linear AfA rate %. */
  afaSatz: number;
  /** Marginal tax rate % (Grenzsteuersatz). */
  steuersatz: number;
  measures: Measure[];
  risks: Risk[];
  collaborators: Collaborator[];
  contact: Contact;
}
