/**
 * Scripted chat logic — the deterministic, testable core of the Chat tab.
 *
 * Everything here is a pure function of its inputs (no timers, no React), so the
 * keyword routing, title derivation and source classification can be unit-tested
 * directly and the ChatTab component stays a thin orchestrator around them.
 *
 * The `replyFor` keyword map is transcribed VERBATIM from the prototype's
 * `reply()` (handoff/design_handoff_dealpilot/DealPilot.dc.html). NO real AI.
 */

import type { ChatMessage } from '../data/chats';
import type { DealDocument, DocsState } from '../data/documents';

/** A scripted AI reply: answer text + its (possibly empty) source reference. */
export type ChatReply = Pick<ChatMessage, 'text' | 'source'>;

/**
 * Map a user question to the canned AI reply + source, first match wins
 * (mirrors the prototype's `reply()` chain exactly):
 *
 *   1. "4,5" / "4.5" / "zins"        → cashflow-at-4,5%   · Kalkulation · Base
 *   2. "dach" / "risiko"             → roof finding        · ETV-Protokoll 2025 · S.3
 *   3. "protokoll" / "zusammen"      → protocol summary    · ETV-Protokoll 2025
 *   4. "verkäufer" / "fragen"        → seller question list· (no source)
 *   5. (default)                     → clarify fallback    · Kalkulation · Base
 */
export function replyFor(text: string): ChatReply {
  const t = text.toLowerCase();

  if (t.includes('4,5') || t.includes('4.5') || t.includes('zins')) {
    return {
      text: 'Bei 4,5 % Sollzins fällt der Cashflow von +49 € auf rund −72 €/Monat. Der Deal wäre dann leicht negativ; über die EK-Rendite (ca. 5,4 %) aber noch tragbar.',
      source: 'Kalkulation · Base',
    };
  }
  if (t.includes('dach') || t.includes('risiko')) {
    return {
      text: 'Belegt: die ETV hat die Dachsanierung ausdrücklich vertagt. Meine Kostenschätzung von 2.600 € ist dein MEA-Anteil bei ~220 €/m².',
      source: 'ETV-Protokoll 2025 · S.3',
    };
  }
  if (t.includes('protokoll') || t.includes('zusammen')) {
    return {
      text: 'Kern der Protokolle 2023–2025: Rücklage mit 42.000 € eher knapp, Dachsanierung vertagt (Risiko), Fassaden-Sonderumlage angekündigt. Sonst keine strittigen Beschlüsse.',
      source: 'ETV-Protokoll 2025',
    };
  }
  if (t.includes('verkäufer') || t.includes('fragen')) {
    return {
      text: 'Vorschlag an den Verkäufer: 1) Aktuelle Beschluss-Sammlung vollständig? 2) Terminplan Dachsanierung? 3) Höhe letzter Sonderumlagen? 4) Aktueller Stand Instandhaltungsrücklage?',
      source: '',
    };
  }
  return {
    text: 'Ich prüfe das anhand der Dokumente und der Kalkulation dieses Deals. Kannst du die Frage etwas konkreter stellen?',
    source: 'Kalkulation · Base',
  };
}

/** Max chat title length before truncation (prototype uses 26 + ellipsis). */
export const TITLE_MAX = 26;

/**
 * Derive a chat title from the first question, but only while the chat is still
 * the untouched "Neuer Chat" (prototype rule). Otherwise keep the title as-is.
 */
export function deriveTitle(currentTitle: string, question: string): string {
  if (currentTitle !== 'Neuer Chat') return currentTitle;
  const t = question.trim();
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX)}…` : t;
}

/** Where a tapped source chip should route. */
export type SourceTarget =
  | { kind: 'document'; doc: DealDocument }
  | { kind: 'calc' }
  | { kind: 'none' };

/**
 * Classify a message's source string into a tap target:
 *   - empty                       → none
 *   - starts with "Kalkulation"   → calc (switch to Kalkulation tab)
 *   - matches a present document   → document (open the DocViewer)
 *   - otherwise                   → none (toast)
 *
 * The document name is the source text up to the first " · " (so both
 * "ETV-Protokoll 2025 · S.3" and "ETV-Protokoll 2025" resolve to the doc).
 */
export function classifySource(source: string, docs: DocsState | undefined): SourceTarget {
  const s = source.trim();
  if (!s) return { kind: 'none' };
  if (/^kalkulation/i.test(s)) return { kind: 'calc' };

  const name = (s.split(' · ')[0] ?? s).trim().toLowerCase();
  const doc = docs?.present.find((d) => d.name.toLowerCase() === name);
  if (doc) return { kind: 'document', doc };

  return { kind: 'none' };
}
