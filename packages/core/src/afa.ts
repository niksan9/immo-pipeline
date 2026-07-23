/**
 * AfA (linear depreciation) helper.
 *
 * Linear rates per the README "AfA-Hintergrund":
 *  - 3,0 % for buildings completed from 2023 onward
 *  - 2,0 % for buildings from 1925 onward
 *  - 2,5 % for buildings before 1925
 *
 * Degressive / special AfA (e.g. 5 % Neubau) is intentionally out of scope.
 */

/** Suggested linear AfA rate (%) for a given construction year. */
export function suggestedAfaSatz(baujahr: number): number {
  if (baujahr >= 2023) return 3.0;
  if (baujahr >= 1925) return 2.0;
  return 2.5;
}
