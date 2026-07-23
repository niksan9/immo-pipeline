/**
 * Mobile-side document model for the Dokumente tab, upload flow and viewer.
 *
 * Documents are NOT (yet) part of @dealpilot/core's `DealState`, so they are
 * modelled here and held in a parallel per-deal slice of the store
 * (src/data/store.tsx). Everything the UI shows about documents — the DD
 * progress card, the row badges, the viewer summary/Fundstelle — is derived
 * from this state (src/lib/docs.ts), never hard-coded in the components.
 *
 * The seed content is transcribed from the design prototype
 * (handoff/design_handoff_dealpilot/DealPilot.dc.html → `docFlagged` / `docOk` /
 * `missing` lists and the Dokumenten-Flow result screen).
 */

/**
 * A present document's finding state:
 *   - `befund`        → has a finding (risk/hint), shown in "Mit Befund"
 *   - `unauffaellig`  → checked, no finding, shown collapsed under "Geprüft"
 * (`fehlt` documents are not present yet and are modelled as `MissingDoc`.)
 */
export type DocStatus = 'befund' | 'unauffaellig' | 'fehlt';

/** Row/viewer badge variant. Green OK, yellow Hinweis, red Risiko. */
export type DocBadge = 'risiko' | 'hinweis' | 'ok';

/** Categories the KI can assign; overridable via the flow's result chips. */
export const DOC_CATEGORIES = [
  'Exposé',
  'Protokoll',
  'Wirtschaftsplan',
  'Teilungserklärung',
  'Grundbuchauszug',
  'Nebenkostenabrechnung',
  'Flurkarte',
  'Energieausweis',
  'Fotos',
  'Sonstiges',
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

/** A document that has been read and classified (present in the deal). */
export interface DealDocument {
  id: string;
  name: string;
  category: DocCategory;
  /** Present documents are `befund` or `unauffaellig`. */
  status: Exclude<DocStatus, 'fehlt'>;
  badge: DocBadge;
  /** Short grade/note shown on the dense row (e.g. "Rücklage 42.000 € · knapp"). */
  note: string;
  /** KI summary shown in the dark card of the viewer. */
  summary: string;
  /** Number of pages (viewer subtitle). */
  pages: number;
  /** Verbatim finding quote ("Fundstelle") — befund docs only. */
  quote?: string;
  /** Source reference for the quote (e.g. "Seite 3 · TOP 7"). */
  source?: string;
  /** Original file name this document was split out of, if any. */
  splitFrom?: string;
}

/** A still-missing document ("Fehlt noch") that can be requested. */
export interface MissingDoc {
  id: string;
  name: string;
}

// --- Seed content (Lindenstraße prototype) ---------------------------------

/** Present documents: 2 with a finding + 5 unremarkable. */
const SEED_PRESENT: DealDocument[] = [
  // --- Mit Befund ---
  {
    id: 'etv-2025',
    name: 'ETV-Protokoll 2025',
    category: 'Protokoll',
    status: 'befund',
    badge: 'risiko',
    note: '3 Beschlüsse · 1 Risiko-Fund',
    pages: 6,
    summary:
      'Protokoll der ordentlichen Eigentümerversammlung 2025. Drei Beschlüsse gefasst; die Dachsanierung wurde erneut vertagt (Risiko-Fund).',
    quote:
      '„TOP 7 – Antrag Dachsanierung: Die Versammlung beschließt mehrheitlich, die Sanierung auf die nächste ordentliche ETV zu vertagen. Angebot ~118.000 € (Gesamt-WEG)."',
    source: 'Seite 3 · TOP 7',
  },
  {
    id: 'wirtschaftsplan-2025',
    name: 'Wirtschaftsplan 2025',
    category: 'Wirtschaftsplan',
    status: 'befund',
    badge: 'hinweis',
    note: 'Rücklage 42.000 € · knapp',
    pages: 4,
    summary:
      'Wirtschaftsplan mit Einnahmen/Ausgaben der WEG. Instandhaltungsrücklage mit 42.000 € eher knapp; Sonderumlage Fassade angekündigt.',
    quote:
      '„Stand Instandhaltungsrücklage zum 31.12.: 42.000 €. Für die Fassade ist eine Sonderumlage vorgesehen."',
    source: 'Seite 1–2',
  },
  // --- Geprüft · unauffällig ---
  {
    id: 'expose',
    name: 'Exposé',
    category: 'Exposé',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'Objektdaten übernommen',
    pages: 8,
    summary:
      'Verkaufsexposé mit Objektdaten. Alle Kennzahlen wurden übernommen; keine Auffälligkeiten.',
  },
  {
    id: 'teilungserklaerung',
    name: 'Teilungserklärung',
    category: 'Teilungserklärung',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'MEA 82/1000',
    pages: 12,
    summary:
      'Teilungserklärung inkl. Aufteilungsplan. Dein Miteigentumsanteil beträgt 82/1000.',
  },
  {
    id: 'grundbuch',
    name: 'Grundbuchauszug',
    category: 'Grundbuchauszug',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'keine Auffälligkeiten',
    pages: 3,
    summary:
      'Aktueller Grundbuchauszug. Keine Belastungen in Abt. II/III auffällig.',
  },
  {
    id: 'nebenkosten',
    name: 'Nebenkostenabrechnung',
    category: 'Nebenkostenabrechnung',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'plausibel',
    pages: 2,
    summary: 'Betriebskostenabrechnung des Vorjahres. Werte plausibel.',
  },
  {
    id: 'flurkarte',
    name: 'Flurkarte',
    category: 'Flurkarte',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'Grenzen ok',
    pages: 1,
    summary:
      'Amtliche Flurkarte. Grundstücksgrenzen ohne Auffälligkeiten.',
  },
];

/** Still-missing documents (4 → DD checklist 7/11). */
const SEED_MISSING: MissingDoc[] = [
  { id: 'beschluss', name: 'Beschluss-Sammlung' },
  { id: 'energieausweis', name: 'Energieausweis' },
  { id: 'wohngeld', name: 'Wohngeldabrechnung' },
  { id: 'baubeschreibung', name: 'Baubeschreibung' },
];

/** Per-deal document slice held in the store. */
export interface DocsState {
  /** Present (read + classified) documents. */
  present: DealDocument[];
  /** Documents still to obtain ("Fehlt noch"). */
  missing: MissingDoc[];
}

/** Fresh, independent copy of the seed doc state (so edits never leak). */
export function seedDocsState(): DocsState {
  return {
    present: SEED_PRESENT.map((d) => ({ ...d })),
    missing: SEED_MISSING.map((m) => ({ ...m })),
  };
}

/**
 * The Foto-Befund document added by "Fotos hochladen" after (simulated)
 * processing. A finding (Hinweis) with no verbatim quote — the KI flags a damp
 * patch from the photos.
 */
export const PHOTO_FINDING_DOC: DealDocument = {
  id: 'foto-mangel',
  name: 'Fotos Objekt',
  category: 'Fotos',
  status: 'befund',
  badge: 'hinweis',
  note: 'KI: Feuchtefleck Kellerwand erkannt',
  pages: 5,
  summary:
    'Automatische Analyse der Objektfotos. Erkennung: ein Feuchtefleck an der Kellerwand — als Hinweis erfasst. Vor-Ort-Prüfung empfohlen.',
};

/**
 * Documents produced by the upload flow's "Übernehmen". The ETV file is split
 * into three yearly protocols; `expose` / `etv-2025` are already present in the
 * seed (merge dedupes by id, so only 2024 / 2023 / the photo hint are new).
 */
export const FLOW_RESULT_DOCS: DealDocument[] = [
  {
    id: 'expose',
    name: 'Exposé',
    category: 'Exposé',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'Objektdaten übernommen',
    pages: 8,
    summary:
      '68 m² ETW, Baujahr 1998, Kaltmiete 800 €, Angebot 189.000 €. Objektdaten übernommen.',
  },
  {
    id: 'etv-2025',
    name: 'ETV-Protokoll 2025',
    category: 'Protokoll',
    status: 'befund',
    badge: 'risiko',
    note: '3 Beschlüsse · 1 Risiko-Fund',
    pages: 6,
    summary:
      'Protokoll der ordentlichen Eigentümerversammlung 2025. Die Dachsanierung wurde erneut vertagt (Risiko-Fund).',
    quote:
      '„TOP 7 – Antrag Dachsanierung: Die Versammlung beschließt mehrheitlich, die Sanierung auf die nächste ordentliche ETV zu vertagen."',
    source: 'Seite 3 · TOP 7',
    splitFrom: 'etv_protokolle_23-25.pdf',
  },
  {
    id: 'etv-2024',
    name: 'ETV-Protokoll 2024',
    category: 'Protokoll',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'keine offenen Beschlüsse',
    pages: 5,
    summary:
      'Protokoll der Eigentümerversammlung 2024. Reguläre Beschlüsse (Jahresabrechnung, Wirtschaftsplan) ohne offene Streitpunkte.',
    splitFrom: 'etv_protokolle_23-25.pdf',
  },
  {
    id: 'etv-2023',
    name: 'ETV-Protokoll 2023',
    category: 'Protokoll',
    status: 'unauffaellig',
    badge: 'ok',
    note: 'keine offenen Beschlüsse',
    pages: 5,
    summary:
      'Protokoll der Eigentümerversammlung 2023. Genehmigung der Vorjahresabrechnung; keine Auffälligkeiten.',
    splitFrom: 'etv_protokolle_23-25.pdf',
  },
];

/** The photo-derived hint surfaced in the flow result (added on Übernehmen). */
export const FLOW_PHOTO_DOC: DealDocument = {
  id: 'foto-flow',
  name: 'Fotos Objekt',
  category: 'Fotos',
  status: 'befund',
  badge: 'hinweis',
  note: '1 Hinweis (Feuchtefleck)',
  pages: 5,
  summary:
    'Analyse der hochgeladenen Objektfotos. Erkennung: ein Feuchtefleck — als Hinweis erfasst.',
};
