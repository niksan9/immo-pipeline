/**
 * Risk lifecycle state machine.
 *
 * Ports the transitions from the README "Risiko-Lebenszyklus (State-Machine)"
 * and `setRiskStatus` / `applyProposal` in DealPilot.dc.html:
 *
 *   open ─[cover]──▶ covered   (appliedCost = estimate)
 *   open ─[accept]─▶ accepted  (appliedCost = 0)
 *   open ─[question]▶ question (appliedCost = 0)
 *   {covered|accepted|question} ─[reopen]──▶ open (appliedCost = 0)
 *   {covered|accepted|question} ─[cover|accept|question]▶ … (Wizard "Aktualisieren")
 *   {open|resolved} ─[context proposal]▶ covered|accepted (+ context/surveyor)
 *
 * Rule: `reopen` (target = "open") is only valid from a resolved state.
 * Targets covered/accepted/question are valid from any state (initial wizard
 * from "open", or re-running the wizard from a resolved state). Everything is
 * a pure function; invalid transitions throw `InvalidRiskTransitionError`.
 */

import type { Risk, RiskStatus } from "./types.js";

/** Resolved = anything other than "open". */
export function isResolved(status: RiskStatus): boolean {
  return status !== "open";
}

/**
 * Sum of `appliedCost` across covered risks (EUR).
 *
 * Only `covered` risks contribute, and a missing / non-numeric `appliedCost`
 * is treated as 0 (the prototype's `(r.appliedCost || 0)` guard). This is the
 * single source of truth for the covered-risk total — calc.ts, score.ts and
 * the mobile app all use it, so a stray NaN can never cascade into GIK / score.
 */
export function coveredRiskCost(risks: readonly Risk[]): number {
  return risks.reduce(
    (sum, r) =>
      sum + (r.status === "covered" && Number.isFinite(r.appliedCost) ? r.appliedCost : 0),
    0,
  );
}

/** Whether a transition from `from` to `to` is allowed. */
export function isValidTransition(from: RiskStatus, to: RiskStatus): boolean {
  if (to === "open") {
    // Only a resolved risk can be reopened.
    return isResolved(from);
  }
  // covered / accepted / question are reachable from any state
  // (initial wizard from "open", or "Aktualisieren" from a resolved state).
  return true;
}

/** Thrown when an invalid risk transition is attempted. */
export class InvalidRiskTransitionError extends Error {
  readonly from: RiskStatus;
  readonly to: RiskStatus;
  constructor(from: RiskStatus, to: RiskStatus) {
    super(`Invalid risk transition: ${from} → ${to}`);
    this.name = "InvalidRiskTransitionError";
    this.from = from;
    this.to = to;
  }
}

/** appliedCost that a target status implies (before any context override). */
function appliedCostFor(risk: Risk, to: RiskStatus): number {
  switch (to) {
    case "covered":
      return risk.estimate;
    case "accepted":
    case "question":
    case "open":
      return 0;
  }
}

/**
 * Apply a status transition, returning a NEW risk (input is never mutated).
 * Throws `InvalidRiskTransitionError` for disallowed transitions.
 */
export function transitionRisk(risk: Risk, to: RiskStatus): Risk {
  if (!isValidTransition(risk.status, to)) {
    throw new InvalidRiskTransitionError(risk.status, to);
  }
  return { ...risk, status: to, appliedCost: appliedCostFor(risk, to) };
}

// --- Named convenience wrappers (all pure) -------------------------------

/** open|resolved → covered, appliedCost = estimate. */
export function coverRisk(risk: Risk): Risk {
  return transitionRisk(risk, "covered");
}

/** open|resolved → accepted, appliedCost = 0. */
export function acceptRisk(risk: Risk): Risk {
  return transitionRisk(risk, "accepted");
}

/** open|resolved → question, appliedCost = 0. */
export function questionRisk(risk: Risk): Risk {
  return transitionRisk(risk, "question");
}

/** resolved → open, appliedCost = 0. Throws if the risk is already open. */
export function reopenRisk(risk: Risk): Risk {
  return transitionRisk(risk, "open");
}

/** A proposal produced by the wizard context dialog. */
export interface ContextProposal {
  /** Resulting status; the dialog only ever proposes covered or accepted. */
  status: "covered" | "accepted";
  /** appliedCost to set (e.g. reduced estimate, or 0 for "Kosten entfallen"). */
  cost: number;
  /** Free-text context to attach. */
  note?: string;
  /** Optional surveyor to attach. */
  surveyor?: string | null;
}

/**
 * Apply a context-dialog proposal (README "Kontext-Dialog: Vorschlag").
 * Unlike `coverRisk`, this lets the proposal override appliedCost (e.g. a
 * reduced estimate), and attaches context/surveyor. Pure; throws on invalid.
 */
export function applyContextProposal(risk: Risk, proposal: ContextProposal): Risk {
  if (!isValidTransition(risk.status, proposal.status)) {
    throw new InvalidRiskTransitionError(risk.status, proposal.status);
  }
  return {
    ...risk,
    status: proposal.status,
    appliedCost: proposal.cost,
    ...(proposal.note !== undefined ? { context: proposal.note } : {}),
    ...(proposal.surveyor !== undefined ? { surveyor: proposal.surveyor } : {}),
  };
}
