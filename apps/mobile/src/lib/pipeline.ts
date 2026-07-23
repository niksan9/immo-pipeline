/**
 * Pure pipeline derivation layer.
 *
 * Turns the seeded {@link SeedDeal}s into render-ready view models by running
 * each deal through @dealpilot/core:
 *   - `calc().brutto`      → gross yield  → `formatPercent`
 *   - `computeScore()`     → score number + Ampel colour (`scoreColor`)
 *   - `formatEUR`          → purchase price
 *
 * All functions here are pure and framework-free so they can be unit-tested
 * without rendering anything.
 */

import {
  calc,
  computeScore,
  formatEUR,
  formatPercent,
  scoreColor,
  type AmpelColor,
  type DealStatus,
  type Objektart,
  type VermietetStatus,
} from '@dealpilot/core';
import { colors } from '../theme/tokens';
import type { SeedDeal } from '../data/deals';

/** Fixed section order shown in the pipeline (matches the design). */
export const SECTION_ORDER: DealStatus[] = [
  'pruefung',
  'neu',
  'verhandlung',
  'verworfen',
];

export const SECTION_LABEL: Record<DealStatus, string> = {
  neu: 'Neu',
  pruefung: 'In Prüfung',
  verhandlung: 'Verhandlung',
  gekauft: 'Gekauft',
  verworfen: 'Verworfen',
};

/** Ampel colour → the three tints a deal row uses (rail, score bg, accent). */
export interface AmpelStyle {
  rail: string;
  softBg: string;
  accent: string;
}

export function ampelStyle(color: AmpelColor): AmpelStyle {
  switch (color) {
    case 'green':
      return { rail: colors.green, softBg: colors.greenSoft, accent: colors.green };
    case 'yellow':
      return { rail: colors.yellow, softBg: colors.yellowSoft, accent: colors.yellow };
    case 'red':
      return { rail: colors.red, softBg: colors.redSoft, accent: colors.red };
  }
}

/** Occupancy status → the German word shown in the subtitle. */
export function occupancyLabel(v: VermietetStatus): string {
  return v === 'vermietet' ? 'vermietet' : 'frei';
}

/** Initials from a full name, e.g. "Lena Weber" → "LW" (max 2 chars). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** "N Risiko" / "N Risiken" pluralisation. */
export function riskLabel(n: number): string {
  return `${n} ${n === 1 ? 'Risiko' : 'Risiken'}`;
}

/** Render-ready view model for a single deal row. */
export interface DealRowVM {
  id: string;
  objektart: Objektart;
  street: string;
  ort: string;
  dealStatus: DealStatus;

  /** "{Art} · {Straße}". */
  title: string;
  /** "Ort · m² · Baujahr · Status" — or the discard note for verworfen rows. */
  subtitle: string;

  priceStr: string;
  yieldStr: string;

  /** Number of still-open risks (drives the "N Risiken" KPI). */
  openRiskCount: number;
  riskLabelStr: string;
  hasRisk: boolean;

  discarded: boolean;

  /** null for discarded rows (they show "—" instead of a score). */
  score: number | null;
  scoreStr: string;
  color: AmpelColor | null;
  style: AmpelStyle | null;

  /** Collaborator initials for shared deals (owner excluded), max 2. */
  sharedInitials: string[];

  /** Lower-cased composite used for free-text search (Ort/Straße/Typ). */
  searchText: string;
}

/** Derive a row view model from a seeded deal (runs it through core). */
export function deriveRow(seed: SeedDeal): DealRowVM {
  const { state } = seed;
  const { deal } = state;
  const discarded = deal.dealStatus === 'verworfen';

  const street = deal.address ?? deal.ort;
  const title = `${deal.objektart} · ${street}`;

  const statusWord = seed.statusLabel ?? occupancyLabel(deal.vermietet);
  const subtitle = discarded
    ? (seed.discardNote ?? '')
    : `${deal.ort} · ${deal.qm} m² · ${deal.baujahr} · ${statusWord}`;

  // Derived numbers — all via core.
  const metrics = calc(state);
  const priceStr = formatEUR(deal.kaufpreis);
  const yieldStr = formatPercent(metrics.brutto);

  const openRiskCount = state.risks.filter((r) => r.status === 'open').length;

  const sharedInitials = state.collaborators
    .filter((c) => c.role !== 'owner')
    .slice(0, 2)
    .map((c) => initials(c.name));

  const searchText = [deal.objektart, street, deal.ort, subtitle]
    .join(' ')
    .toLowerCase();

  if (discarded) {
    return {
      id: seed.id,
      objektart: deal.objektart,
      street,
      ort: deal.ort,
      dealStatus: deal.dealStatus,
      title,
      subtitle,
      priceStr,
      yieldStr,
      openRiskCount,
      riskLabelStr: riskLabel(openRiskCount),
      hasRisk: openRiskCount > 0,
      discarded: true,
      score: null,
      scoreStr: '—',
      color: null,
      style: null,
      sharedInitials,
      searchText,
    };
  }

  const { scoreVal } = computeScore(state.risks);
  const color = scoreColor(scoreVal);

  return {
    id: seed.id,
    objektart: deal.objektart,
    street,
    ort: deal.ort,
    dealStatus: deal.dealStatus,
    title,
    subtitle,
    priceStr,
    yieldStr,
    openRiskCount,
    riskLabelStr: riskLabel(openRiskCount),
    hasRisk: openRiskCount > 0,
    discarded: false,
    score: scoreVal,
    scoreStr: String(scoreVal),
    color,
    style: ampelStyle(color),
    sharedInitials,
    searchText,
  };
}

export function deriveRows(seeds: SeedDeal[]): DealRowVM[] {
  return seeds.map(deriveRow);
}

/** Case-insensitive free-text filter over Ort / Straße / Typ (and subtitle). */
export function filterRows(rows: DealRowVM[], query: string): DealRowVM[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => r.searchText.includes(q));
}

/** A pipeline section: fixed-order status group with its counter. */
export interface PipelineSection {
  key: DealStatus;
  label: string;
  count: number;
  rows: DealRowVM[];
}

/**
 * Group rows into the fixed-order sections. While searching (non-empty query)
 * the "Verworfen" section is hidden (matches the prototype's `notSearching`
 * behaviour) and empty sections are dropped.
 */
export function buildSections(
  rows: DealRowVM[],
  query: string,
): PipelineSection[] {
  const searching = query.trim().length > 0;
  const filtered = filterRows(rows, query);

  const sections: PipelineSection[] = [];
  for (const key of SECTION_ORDER) {
    if (key === 'verworfen' && searching) continue;
    const sectionRows = filtered.filter((r) => r.dealStatus === key);
    if (searching && sectionRows.length === 0) continue;
    sections.push({
      key,
      label: SECTION_LABEL[key],
      count: sectionRows.length,
      rows: sectionRows,
    });
  }
  return sections;
}
