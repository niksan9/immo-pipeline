/**
 * Mobile-side multi-chat model for the Chat tab (README "2d. Tab Chat").
 *
 * Chats are NOT (yet) part of @dealpilot/core's `DealState` — the README's state
 * model does put `chats[]`+`activeChatId` in the deal state, but for now they are
 * modelled here and held in a parallel per-deal slice of the store
 * (src/data/store.tsx), exactly like the document slice. The scripted reply
 * logic + source classification live in src/lib/chat.ts.
 *
 * Seed content is transcribed verbatim from the design prototype
 * (handoff/design_handoff_dealpilot/DealPilot.dc.html → `chats` seed, `reply()`
 * keyword map and the Chat-Verlauf sheet).
 */

import type { SeedDeal } from './deals';

/** One chat message. AI bubbles are white + `KI` avatar; user bubbles dark. */
export interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
  /**
   * Source reference under an AI message (e.g. "ETV-Protokoll 2025 · S.3" or
   * "Kalkulation · Base"). Empty for intros / seller-question replies. Tapping a
   * non-empty source is resolved via `classifySource` (src/lib/chat.ts).
   */
  source: string;
}

/**
 * The "linked topic" chip shown in the chat header bar.
 *   - `risk` → tapping navigates to that risk (target = riskId)
 *   - `calc` → tapping switches to the Kalkulation tab
 *   - `document` → tapping opens the DocViewer (target = document id)
 */
export type ChatLinkKind = 'risk' | 'calc' | 'document';

export interface ChatLink {
  kind: ChatLinkKind;
  /** Chip label, e.g. "Risiko · Marodes Dach" / "Kalkulation · Base". */
  label: string;
  /** riskId (risk) or document id (document); unused for calc. */
  target?: string;
}

/** One chat thread within a deal. */
export interface ChatThread {
  id: string;
  title: string;
  linked: ChatLink | null;
  msgs: ChatMessage[];
}

/** Per-deal chat slice held in the store. */
export interface ChatsState {
  threads: ChatThread[];
  activeChatId: string;
}

/** Intro line for the generic "Allgemein" chat (prototype). */
const ALLGEMEIN_INTRO =
  'Ich kenne alle Dokumente und die Base-Kalkulation dieses Deals. Frag mich, was du wissen willst.';

/** Intro line for a fresh empty chat (prototype "Neuer Chat"). */
export const NEW_CHAT_INTRO =
  'Neuer Chat zu diesem Deal. Was möchtest du wissen?';

/**
 * Fresh, independent chat state for a deal. Every deal gets a generic
 * "Allgemein" thread; deals whose risk list contains a Dach risk additionally
 * get the prototype's "Dach-Risiko klären" thread linked to that risk (this is
 * the Lindenstraße seed). The Dach thread is listed first and is the active one,
 * matching the prototype's ordering.
 */
export function seedChatsState(seed: SeedDeal): ChatsState {
  const threads: ChatThread[] = [
    {
      id: 'allgemein',
      title: 'Allgemein',
      linked: null,
      msgs: [{ role: 'ai', text: ALLGEMEIN_INTRO, source: '' }],
    },
  ];

  const dachRisk = seed.state.risks.find((r) => /dach/i.test(r.title));
  if (dachRisk) {
    threads.unshift({
      id: 'dach-risiko',
      title: 'Dach-Risiko klären',
      linked: {
        kind: 'risk',
        label: 'Risiko · Marodes Dach',
        target: dachRisk.id,
      },
      msgs: [
        { role: 'user', text: 'Wie sicher ist das Dach-Risiko?', source: '' },
        {
          role: 'ai',
          text: 'Belegt: die ETV hat die Dachsanierung ausdrücklich vertagt. Meine Kostenschätzung von 2.600 € ist dein MEA-Anteil bei ~220 €/m².',
          source: 'ETV-Protokoll 2025 · S.3',
        },
      ],
    });
  }

  return { threads, activeChatId: 'allgemein' };
}

/** The suggestion chips above the input (prototype). Tapping sends the text. */
export const CHAT_SUGGESTIONS = [
  'Fass die Protokolle zusammen',
  'Was bei Zins 4,5 %?',
  'Fragen an den Verkäufer',
] as const;

/** Build the initial thread for a "Zum Dokument fragen" chat (DocViewer). */
export function docChatThread(id: string, docId: string, docName: string): ChatThread {
  return {
    id,
    title: `Frage zu ${docName}`,
    linked: { kind: 'document', label: `Dokument · ${docName}`, target: docId },
    msgs: [
      {
        role: 'ai',
        text: `Frag mich alles zu „${docName}". Ich antworte mit Beleg aus dem Dokument.`,
        source: '',
      },
    ],
  };
}
