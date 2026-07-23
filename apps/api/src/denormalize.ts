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

export function denormalize(state: DealState): Denormalized {
  const { deal } = state;
  const title =
    deal.address && deal.address.trim().length > 0
      ? deal.address.trim()
      : `${deal.objektart} · ${deal.ort}`;
  return {
    dealStatus: deal.dealStatus,
    title,
    ort: deal.ort,
    kaufpreis: Math.round(deal.kaufpreis),
    score: computeScore(state.risks).scoreVal,
  };
}

/**
 * Minimal structural guard: enough to safely denormalize. The client owns the
 * full schema, so we only assert the fields we read here.
 */
export function isDealStateLike(body: unknown): body is DealState {
  if (typeof body !== "object" || body === null) return false;
  const deal = (body as { deal?: unknown }).deal;
  const risks = (body as { risks?: unknown }).risks;
  if (typeof deal !== "object" || deal === null) return false;
  const d = deal as Record<string, unknown>;
  return (
    typeof d.objektart === "string" &&
    typeof d.ort === "string" &&
    typeof d.kaufpreis === "number" &&
    typeof d.dealStatus === "string" &&
    Array.isArray(risks)
  );
}
