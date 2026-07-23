/**
 * Pure chat-logic tests (src/lib/chat.ts): scripted keyword routing, title
 * derivation and source classification. These are the deterministic core the
 * ChatTab orchestrates, so they are tested directly without React.
 */

import { classifySource, deriveTitle, replyFor } from '../src/lib/chat';
import { seedDocsState } from '../src/data/documents';

describe('replyFor — keyword routing (first match wins)', () => {
  it('routes a Zins question to the Kalkulation · Base cashflow answer', () => {
    const r = replyFor('Was passiert bei Zins 4,5 %?');
    expect(r.source).toBe('Kalkulation · Base');
    expect(r.text).toContain('−72 €/Monat');
  });

  it('matches the "4.5" spelling too', () => {
    expect(replyFor('rate at 4.5 percent').source).toBe('Kalkulation · Base');
  });

  it('routes a Dach/Risiko question to the ETV-Protokoll S.3 finding', () => {
    const r = replyFor('Wie sicher ist das Dach-Risiko?');
    expect(r.source).toBe('ETV-Protokoll 2025 · S.3');
    expect(r.text).toContain('MEA-Anteil');
  });

  it('routes a Protokoll/summary question to the ETV-Protokoll source', () => {
    const r = replyFor('Fass die Protokolle zusammen');
    expect(r.source).toBe('ETV-Protokoll 2025');
    expect(r.text).toContain('Rücklage');
  });

  it('routes a Verkäufer/Fragen question to a sourceless seller list', () => {
    const r = replyFor('Fragen an den Verkäufer');
    expect(r.source).toBe('');
    expect(r.text).toContain('Vorschlag an den Verkäufer');
  });

  it('falls back to the clarify answer with Kalkulation · Base', () => {
    const r = replyFor('Wie ist das Wetter?');
    expect(r.source).toBe('Kalkulation · Base');
    expect(r.text).toContain('konkreter');
  });

  it('keyword precedence: Zins beats Risiko', () => {
    // Contains both "zins" and "risiko" → Zins branch wins (checked first).
    expect(replyFor('Zins-Risiko?').source).toBe('Kalkulation · Base');
  });
});

describe('deriveTitle — only while still "Neuer Chat"', () => {
  it('derives a short title verbatim from the first question', () => {
    expect(deriveTitle('Neuer Chat', 'Wie hoch ist die Miete?')).toBe(
      'Wie hoch ist die Miete?',
    );
  });

  it('truncates a long question at 26 chars + ellipsis', () => {
    const long = 'Bitte erkläre mir sehr ausführlich die ganze Kalkulation';
    expect(deriveTitle('Neuer Chat', long)).toBe('Bitte erkläre mir sehr aus…');
  });

  it('keeps an already-named chat title unchanged', () => {
    expect(deriveTitle('Dach-Risiko klären', 'egal was')).toBe('Dach-Risiko klären');
  });

  it('truncates by code point so an emoji at the boundary is never split', () => {
    // 26 astral emoji then more text: cut after 26 whole emoji, no lone surrogate.
    const q = '🏠'.repeat(26) + ' und noch viel mehr Text';
    const title = deriveTitle('Neuer Chat', q);
    expect(title).toBe('🏠'.repeat(26) + '…');
    // No unpaired surrogate leaked in (would make the string longer per code pt).
    expect(Array.from(title)).toHaveLength(27); // 26 emoji + the ellipsis
  });
});

describe('classifySource — tap target resolution', () => {
  const docs = seedDocsState();

  it('classifies an empty source as none', () => {
    expect(classifySource('', docs)).toEqual({ kind: 'none' });
  });

  it('classifies a Kalkulation source as calc', () => {
    expect(classifySource('Kalkulation · Base', docs)).toEqual({ kind: 'calc' });
  });

  it('resolves a document source (with page suffix) to the present document', () => {
    const r = classifySource('ETV-Protokoll 2025 · S.3', docs);
    expect(r.kind).toBe('document');
    if (r.kind === 'document') expect(r.doc.id).toBe('etv-2025');
  });

  it('resolves a bare document name too', () => {
    const r = classifySource('ETV-Protokoll 2025', docs);
    expect(r.kind).toBe('document');
    if (r.kind === 'document') expect(r.doc.id).toBe('etv-2025');
  });

  it('falls back to none for an unknown source', () => {
    expect(classifySource('Irgendeine Quelle', docs)).toEqual({ kind: 'none' });
  });
});
