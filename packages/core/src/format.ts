/**
 * Display formatting helpers (de-DE). Rounding lives here, never in calc.
 * Mirrors fmt/euro/signed/pct in DealPilot.dc.html.
 */

const DE = "de-DE";

/** Rounded integer with de-DE grouping, e.g. 189000 → "189.000". */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString(DE);
}

/** Rounded EUR amount, e.g. 189000 → "189.000 €". */
export function formatEUR(n: number): string {
  return `${formatNumber(n)} €`;
}

/**
 * Signed EUR amount using a typographic minus (−), e.g. 49 → "+49 €",
 * -72 → "−72 €". Zero renders as "+0 €" (matches prototype's `signed`).
 */
export function formatSignedEUR(n: number): string {
  const r = Math.round(n);
  const sign = r >= 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(r))} €`;
}

/** Percentage with one decimal and a de-DE comma, e.g. 3.8 → "3,8 %". */
export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals).replace(".", ",")} %`;
}

/**
 * Mono-style fixed-decimal number with de-DE grouping and comma decimals,
 * for IBM Plex Mono metric readouts, e.g. 1234.5 → "1.234,50".
 */
export function formatMono(n: number, decimals = 2): string {
  return n.toLocaleString(DE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
