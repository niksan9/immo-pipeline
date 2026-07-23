/**
 * Deal score, documentation confidence and recommended max price.
 *
 * !!! PROTOTYPE HEURISTIC !!!
 * These formulas are lifted verbatim from `renderVals()` in DealPilot.dc.html
 * and the README "Score" section. They are deliberately simple placeholders
 * ("Prototyp-Heuristik — durch echtes Modell ersetzen") and are NOT a real
 * valuation model. The magic constants (74, 2, 1500, 41, 8, 180600, 100) come
 * straight from the prototype and should be replaced by a proper model later.
 */

import type { Risk } from "./types.js";

/** Ampel color used across the app. */
export type AmpelColor = "green" | "yellow" | "red";

export interface ScoreResult {
  /** Count of risks not in the "open" state. */
  resolvedN: number;
  /** Sum of appliedCost across covered risks (EUR). */
  totalCovered: number;
  /** Overall deal score, clamped to [40, 95]. */
  scoreVal: number;
  /** Documentation confidence, clamped to [0, 95]. */
  dokuVal: number;
  /** Recommended maximum price (EUR), rounded to nearest 100. */
  maxPreis: number;
  /** Ampel color derived from scoreVal. */
  color: AmpelColor;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Ampel color from a score: ≥70 green, ≥50 yellow, else red. */
export function scoreColor(scoreVal: number): AmpelColor {
  if (scoreVal >= 70) return "green";
  if (scoreVal >= 50) return "yellow";
  return "red";
}

/** Compute score, doku confidence and max price from the risk list. */
export function computeScore(risks: readonly Risk[]): ScoreResult {
  const resolvedN = risks.filter((r) => r.status !== "open").length;
  const totalCovered = risks.reduce(
    (sum, r) => sum + (r.status === "covered" ? r.appliedCost : 0),
    0,
  );

  const scoreVal = clamp(
    Math.round(74 + resolvedN * 2 - totalCovered / 1500),
    40,
    95,
  );
  const dokuVal = clamp(41 + resolvedN * 8, 0, 95);
  const maxPreis = Math.round((180600 - totalCovered) / 100) * 100;

  return {
    resolvedN,
    totalCovered,
    scoreVal,
    dokuVal,
    maxPreis,
    color: scoreColor(scoreVal),
  };
}
