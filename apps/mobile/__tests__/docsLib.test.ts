/**
 * Pure document view-model tests (src/lib/docs.ts) against the seed doc state.
 * The DD progress is derived from the list, so mutating the list (requesting a
 * missing doc, adding a document) must move the counter/bar/note accordingly.
 */

import { colors } from '../src/theme/tokens';
import {
  badgeStyle,
  befundDocs,
  ddProgress,
  docDotColor,
  pagesLabel,
  unauffaelligDocs,
} from '../src/lib/docs';
import {
  FLOW_PHOTO_DOC,
  PHOTO_FINDING_DOC,
  seedDocsState,
} from '../src/data/documents';

describe('ddProgress — derived from list state', () => {
  it('seed state is 7 / 11 with "4 offen · 2 mit Risiko-Fund"', () => {
    const dd = ddProgress(seedDocsState());
    expect(dd.done).toBe(7);
    expect(dd.total).toBe(11);
    expect(dd.str).toBe('7 / 11');
    expect(dd.pctStr).toBe('64%');
    expect(dd.note).toBe('4 offen · 2 mit Risiko-Fund');
  });

  it('requesting a missing doc shrinks the checklist and advances the bar', () => {
    const docs = seedDocsState();
    docs.missing = docs.missing.filter((m) => m.id !== 'beschluss');
    const dd = ddProgress(docs);
    expect(dd.str).toBe('7 / 10');
    expect(dd.note).toBe('3 offen · 2 mit Risiko-Fund');
    expect(dd.fraction).toBeGreaterThan(7 / 11);
  });

  it('adding present documents grows both counters', () => {
    const docs = seedDocsState();
    docs.present = [...docs.present, PHOTO_FINDING_DOC];
    const dd = ddProgress(docs);
    expect(dd.str).toBe('8 / 12');
    // Photo finding is a befund → risk-fund count ticks to 3.
    expect(dd.note).toBe('4 offen · 3 mit Risiko-Fund');
  });
});

describe('grouping helpers', () => {
  it('splits present docs into befund (2) and unauffällig (5)', () => {
    const docs = seedDocsState();
    expect(befundDocs(docs).map((d) => d.name)).toEqual([
      'ETV-Protokoll 2025',
      'Wirtschaftsplan 2025',
    ]);
    expect(unauffaelligDocs(docs)).toHaveLength(5);
    expect(unauffaelligDocs(docs).every((d) => d.status === 'unauffaellig')).toBe(true);
  });
});

describe('badgeStyle — variants', () => {
  it('maps risiko/hinweis/ok to labels + ampel colours', () => {
    expect(badgeStyle('risiko')).toMatchObject({ text: 'Risiko', color: colors.red, bg: colors.redSoft, dot: colors.red });
    expect(badgeStyle('hinweis')).toMatchObject({ text: 'Hinweis', color: colors.yellow, bg: colors.yellowSoft, dot: colors.yellow });
    expect(badgeStyle('ok')).toMatchObject({ text: 'OK', color: colors.greenText, bg: colors.greenSoft, dot: colors.green });
  });

  it('docDotColor uses the badge dot colour', () => {
    const [etv, wp] = befundDocs(seedDocsState());
    expect(docDotColor(etv!)).toBe(colors.red);
    expect(docDotColor(wp!)).toBe(colors.yellow);
  });
});

describe('pagesLabel', () => {
  it('singular / plural', () => {
    expect(pagesLabel(1)).toBe('1 Seite');
    expect(pagesLabel(6)).toBe('6 Seiten');
  });
});

describe('flow result docs', () => {
  it('the photo hint is a befund/hinweis (grows the risk-fund count)', () => {
    expect(FLOW_PHOTO_DOC.status).toBe('befund');
    expect(FLOW_PHOTO_DOC.badge).toBe('hinweis');
  });
});
