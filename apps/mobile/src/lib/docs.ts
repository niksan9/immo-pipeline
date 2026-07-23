/**
 * Pure view-model helpers for the Dokumente tab / viewer.
 *
 * Kept free of React so they can be unit-tested directly (see docsLib.test.ts).
 * The DD-Fortschritt card, row badge colours and grouped lists are all *derived*
 * from the per-deal `DocsState`, so requesting a missing document or adding a
 * finding recomputes them live.
 */

import { colors } from '../theme/tokens';
import type {
  DealDocument,
  DocBadge,
  DocsState,
} from '../data/documents';

/** DD-Checkliste card values, derived from the document list state. */
export interface DdProgress {
  /** Present (read) documents. */
  done: number;
  /** Present + still-missing = full checklist size. */
  total: number;
  /** Fraction 0…1. */
  fraction: number;
  /** "7 / 11". */
  str: string;
  /** "64%" — bar width. */
  pctStr: string;
  /** "4 offen · 2 mit Risiko-Fund". */
  note: string;
}

/**
 * Derive the DD checklist progress. `done` counts present documents, `total`
 * adds the still-missing ones. Requesting a missing doc removes it from the
 * checklist (total shrinks → the bar advances); adding a document grows both.
 */
export function ddProgress(docs: DocsState): DdProgress {
  const done = docs.present.length;
  const missing = docs.missing.length;
  const total = done + missing;
  const befund = docs.present.filter((d) => d.status === 'befund').length;
  const fraction = total > 0 ? done / total : 0;
  return {
    done,
    total,
    fraction,
    str: `${done} / ${total}`,
    pctStr: `${Math.round(fraction * 100)}%`,
    note: `${missing} offen · ${befund} mit Risiko-Fund`,
  };
}

/** Documents with a finding, shown dense under "Mit Befund". */
export function befundDocs(docs: DocsState): DealDocument[] {
  return docs.present.filter((d) => d.status === 'befund');
}

/** Checked, unremarkable documents (collapsed under "Geprüft · unauffällig"). */
export function unauffaelligDocs(docs: DocsState): DealDocument[] {
  return docs.present.filter((d) => d.status === 'unauffaellig');
}

/** Ampel dot colour for a document, from its finding status/badge. */
export function docDotColor(doc: DealDocument): string {
  return badgeStyle(doc.badge).dot;
}

export interface BadgeStyle {
  /** Badge label ("Risiko" / "Hinweis" / "OK"). */
  text: string;
  /** Text colour. */
  color: string;
  /** Pill background. */
  bg: string;
  /** Matching ampel dot colour. */
  dot: string;
}

/** Row/viewer badge styling per variant (green OK / yellow Hinweis / red Risiko). */
export function badgeStyle(badge: DocBadge): BadgeStyle {
  switch (badge) {
    case 'risiko':
      return { text: 'Risiko', color: colors.red, bg: colors.redSoft, dot: colors.red };
    case 'hinweis':
      return { text: 'Hinweis', color: colors.yellow, bg: colors.yellowSoft, dot: colors.yellow };
    case 'ok':
    default:
      return { text: 'OK', color: colors.greenText, bg: colors.greenSoft, dot: colors.green };
  }
}

/** "6 Seiten" / "1 Seite" for the viewer subtitle. */
export function pagesLabel(pages: number): string {
  return `${pages} ${pages === 1 ? 'Seite' : 'Seiten'}`;
}
