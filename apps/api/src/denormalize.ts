/**
 * Extracts the denormalized listing columns from a full DealState.
 * The client is source of truth for calc inputs; these are cheap copies the
 * server keeps in scalar columns so /api/deals can list without parsing jsonb.
 */
import { computeScore, type DealState } from "@dealpilot/core";

export interface Denormalized {
  dealStatus: string;
  title: string;
  ort: string;
  kaufpreis: number;
  score: number;
}

/** Real-estate prices never approach int32 max; the column is `integer`. */
const MAX_KAUFPREIS = 2_000_000_000;

export function denormalize(state: DealState): Denormalized {
  const { deal } = state;
  const title =
    deal.address && deal.address.trim().length > 0
      ? deal.address.trim()
      : `${deal.objektart} · ${deal.ort}`;
  // Belt-and-suspenders: computeScore is already clamped to [40, 95], but never
  // let a non-finite value reach the `score` integer column. isDealStateLike
  // already rejects the payloads that could make this non-finite.
  const rawScore = computeScore(state.risks).scoreVal;
  const score = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
  return {
    dealStatus: deal.dealStatus,
    title,
    ort: deal.ort,
    kaufpreis: Math.round(deal.kaufpreis),
    score,
  };
}

/**
 * Structural guard: enough to safely denormalize *and* to reject payloads that
 * would otherwise crash the handler (surfacing as a 500 instead of a clean
 * 400). The client owns the full schema; we only assert the fields we read plus
 * the invariants our column types / string ops depend on.
 */
export function isDealStateLike(body: unknown): body is DealState {
  if (typeof body !== "object" || body === null) return false;
  const deal = (body as { deal?: unknown }).deal;
  const risks = (body as { risks?: unknown }).risks;
  if (typeof deal !== "object" || deal === null) return false;
  const d = deal as Record<string, unknown>;

  if (
    typeof d.objektart !== "string" ||
    typeof d.ort !== "string" ||
    typeof d.dealStatus !== "string"
  ) {
    return false;
  }

  // `denormalize` calls `deal.address.trim()`, so a truthy non-string would
  // crash. Allow only string | undefined (null/number/etc. are rejected).
  if (d.address !== undefined && typeof d.address !== "string") return false;

  // `kaufpreis` lands in an `integer` column via Math.round; reject NaN/±Inf
  // and out-of-range values before they overflow the column.
  if (
    typeof d.kaufpreis !== "number" ||
    !Number.isFinite(d.kaufpreis) ||
    d.kaufpreis < 0 ||
    d.kaufpreis > MAX_KAUFPREIS
  ) {
    return false;
  }

  if (!Array.isArray(risks)) return false;
  for (const risk of risks) {
    if (typeof risk !== "object" || risk === null) return false;
    const r = risk as Record<string, unknown>;
    if (typeof r.status !== "string") return false;
    // A covered risk feeds appliedCost into the score; require it to be finite.
    if (r.status === "covered" && !Number.isFinite(r.appliedCost)) return false;
  }

  return true;
}
