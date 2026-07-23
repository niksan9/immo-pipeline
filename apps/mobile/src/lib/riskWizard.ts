/**
 * Scripted, client-side logic for the risk wizard's context dialog.
 *
 * There is NO real AI here — the prototype (`sendCtx` in DealPilot.dc.html)
 * fakes an assistant with a keyword test and a two-turn script. This module
 * ports that logic verbatim so it can be unit-tested in isolation and reused by
 * the <RiskWizard /> component.
 *
 * Extracted rules (from `sendCtx`):
 *   if (userTurns < 2 && !relieving) → clarifying question, no proposal
 *   else if (relieving)              → "Kosten entfallen"  (accepted, 0 €)
 *   else                             → "Kosten reduziert"  (covered, estimate/2)
 *
 * The prototype's keyword test matched bare `verkäufer` and bare `niedriger`,
 * so neutral phrasing like "Ich frage noch beim Verkäufer nach" or "Kosten
 * könnten niedriger sein" was misclassified as relieving → the wizard proposed
 * waiving the cost to 0 € on hearsay. The pattern below is tightened to require
 * genuinely relieving *evidence* (a document, a fix, an assurance) instead.
 */

import type { ContextProposal } from '@dealpilot/core';

/**
 * Relieving-context keyword test. If the user's free text matches, the risk is
 * treated as (at least partly) mitigated. Only genuine evidence matches: a
 * takeover/assurance (`übernimmt`/`übernommen`), a survey (`gutachten`/
 * `gutachter`), a confirmed condition (`trocken`, `saniert`, `behoben`,
 * `nichts kaputt`, `kein mangel`, `kein schaden`), or that it is done/proven
 * (`erledigt`, `nachweislich`). A bare `verkäufer` mention or a vague
 * `niedriger` no longer waives cost — those fall through to the neutral reply.
 */
export const RELIEVING_PATTERN =
  /übernimmt|übernommen|gutachten|gutachter|trocken|saniert|behoben|nichts kaputt|kein mangel|kein schaden|erledigt|nachweislich/;

/** Does the user's message contain relieving context? */
export function isRelieving(text: string): boolean {
  return RELIEVING_PATTERN.test(text.toLowerCase());
}

/** The initial assistant prompt shown when the context step opens. */
export const CONTEXT_INTRO =
  'Was weißt du zusätzlich, das nicht in den Dokumenten steht? Ich prüfe es und passe das Risiko an oder frage nach.';

/** A wizard proposal = a core ContextProposal plus a display label. */
export interface WizardProposal extends ContextProposal {
  /** UI label, e.g. "Kosten entfallen" / "Kosten reduziert". */
  label: string;
}

export interface CtxResponse {
  /** The assistant's scripted reply. */
  reply: string;
  /** A proposal to apply via core, or null (stays open / needs more info). */
  proposal: WizardProposal | null;
}

export interface CtxInput {
  /** The user's just-sent message. */
  text: string;
  /** Number of user turns INCLUDING this message (1 on the first send). */
  userTurns: number;
  /** The risk's KI estimate (used for the "reduced" proposal). */
  estimate: number;
}

/**
 * Produce the assistant's response to a context message. Pure — the caller owns
 * the (fake) "arbeitet…" delay and message-list bookkeeping.
 *
 *  - First neutral message      → asks for written proof, no proposal.
 *  - Any relieving message       → "Kosten entfallen" (accepted, 0 €).
 *  - Second+ neutral message     → "Kosten reduziert" (covered, estimate/2).
 */
export function respondToContext({
  text,
  userTurns,
  estimate,
}: CtxInput): CtxResponse {
  const relieving = isRelieving(text);

  if (userTurns < 2 && !relieving) {
    return {
      reply:
        'Verstanden. Liegt dir das schriftlich vor (Gutachten, E-Mail, Protokoll) – oder ist es eine mündliche Auskunft?',
      proposal: null,
    };
  }

  if (relieving) {
    return {
      reply:
        'Danke, das ändert die Einschätzung. Ich schlage vor, die Kosten entfallen zu lassen.',
      proposal: { label: 'Kosten entfallen', status: 'accepted', cost: 0, note: text },
    };
  }

  return {
    reply: 'Alles klar. Ich passe die angesetzten Kosten auf deine Angabe an.',
    proposal: {
      label: 'Kosten reduziert',
      status: 'covered',
      cost: Math.round((estimate || 0) / 2),
      note: text,
    },
  };
}

/** The effect string shown on a proposal card ("0 €" or "−1.300 €"). */
export function proposalEffect(
  proposal: WizardProposal,
  fmt: (n: number) => string,
): string {
  return proposal.cost === 0 ? '0 €' : `−${fmt(proposal.cost)} €`;
}
