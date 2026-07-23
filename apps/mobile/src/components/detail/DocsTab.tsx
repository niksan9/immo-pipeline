/**
 * Tab "Dokumente" — README "2c. Tab Dokumente".
 *
 *   - DD-Fortschritt (dark card): "DD-Checkliste N/M" + bar + note, all derived
 *     live from the document list state (src/lib/docs.ts) — never hard-coded.
 *   - "Mit Befund": dense rows (ampel dot, name, note, badge, chevron) → viewer.
 *   - "Geprüft · unauffällig": collapsed by default, toggle to reveal.
 *   - "Fehlt noch": dashed rows with "Anfordern" → KI-Mail (toast), row vanishes,
 *     DD progress updates.
 *   - Two big buttons: "Fotos hochladen" (teal; simulated processing → adds a
 *     Foto-Befund) and "Dokument" (→ upload flow).
 *
 * Owns the Doku-Viewer and the upload-flow overlays plus the (simulated) photo
 * processing timer.
 */

import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import {
  badgeStyle,
  befundDocs,
  ddProgress,
  docDotColor,
  unauffaelligDocs,
} from '../../lib/docs';
import {
  PHOTO_FINDING_DOC,
  type DealDocument,
  type DocsState,
} from '../../data/documents';
import { ChevronRight } from '../icons';
import { DocViewer } from './DocViewer';
import { DocUploadFlow } from './DocUploadFlow';

/** Simulated photo-processing delay before the Foto-Befund appears. */
export const PHOTO_MS = 1400;

export interface DocsTabProps {
  docs: DocsState;
  /** Remove a missing doc from the checklist (store.requestDocument). */
  onRequestDoc: (missingId: string) => void;
  /** Merge recognised documents into the deal (store.addDocuments). */
  onAddDocuments: (docs: DealDocument[]) => void;
  /** "Zum Dokument fragen": open the Chat tab with a chat linked to the doc. */
  onAskDocument: (doc: DealDocument) => void;
  onToast: (msg: string) => void;
}

export function DocsTab({
  docs,
  onRequestDoc,
  onAddDocuments,
  onAskDocument,
  onToast,
}: DocsTabProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [activeDoc, setActiveDoc] = React.useState<DealDocument | null>(null);
  const [flowOpen, setFlowOpen] = React.useState(false);
  const [processingPhotos, setProcessingPhotos] = React.useState(false);
  const photoTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (photoTimer.current) clearTimeout(photoTimer.current);
    },
    [],
  );

  const dd = ddProgress(docs);
  const befund = befundDocs(docs);
  const unauffaellig = unauffaelligDocs(docs);
  const missing = docs.missing;

  const requestDoc = (missingId: string, name: string) => {
    onRequestDoc(missingId);
    onToast(`KI-Mail an Verwalter erstellt · ${name}`);
  };

  const uploadPhotos = () => {
    if (processingPhotos) return;
    setProcessingPhotos(true);
    onToast('Fotos werden analysiert …');
    photoTimer.current = setTimeout(() => {
      onAddDocuments([PHOTO_FINDING_DOC]);
      onToast('3 Fotos analysiert · 1 neuer Hinweis');
      setProcessingPhotos(false);
    }, PHOTO_MS);
  };

  const okLabel = expanded
    ? 'Einklappen ▴'
    : `${unauffaellig.length} unauffällige einblenden ▾`;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        testID="docs-scroll"
      >
        {/* DD-Fortschritt */}
        <View style={styles.ddCard} testID="dd-card">
          <View style={styles.ddHead}>
            <Text style={styles.ddTitle}>DD-Checkliste</Text>
            <Text style={styles.ddValue} testID="dd-value">
              {dd.str}
            </Text>
          </View>
          <View style={styles.ddTrack}>
            <View
              style={[styles.ddFill, { width: `${Math.round(dd.fraction * 100)}%` }]}
              testID="dd-fill"
            />
          </View>
          <Text style={styles.ddNote} testID="dd-note">
            {dd.note}
          </Text>
        </View>

        {/* Mit Befund */}
        <View style={styles.sectionRow}>
          <Text style={type.monoLabel}>MIT BEFUND · {befund.length}</Text>
        </View>
        <View style={styles.listCard}>
          {befund.map((d, i) => {
            const badge = badgeStyle(d.badge);
            return (
              <Pressable
                key={d.id}
                onPress={() => setActiveDoc(d)}
                accessibilityRole="button"
                style={[styles.befundRow, i > 0 && styles.rowDivider]}
                testID={`doc-row-${d.id}`}
              >
                <View style={[styles.dot, { backgroundColor: docDotColor(d) }]} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={styles.rowNote} numberOfLines={1}>
                    {d.note}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]} testID={`doc-badge-${d.id}`}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                </View>
                <ChevronRight size={13} />
              </Pressable>
            );
          })}
        </View>

        {/* Geprüft · unauffällig */}
        <Text style={[type.monoLabel, styles.sectionLabel]}>GEPRÜFT · UNAUFFÄLLIG</Text>
        <View style={styles.listCard}>
          {expanded &&
            unauffaellig.map((d, i) => (
              <Pressable
                key={d.id}
                onPress={() => setActiveDoc(d)}
                accessibilityRole="button"
                style={[styles.okRow, i > 0 && styles.rowDivider]}
                testID={`doc-row-${d.id}`}
              >
                <View style={[styles.dot, { backgroundColor: docDotColor(d) }]} />
                <Text style={styles.okName} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={styles.okBadge}>{badgeStyle(d.badge).text}</Text>
                <ChevronRight size={12} />
              </Pressable>
            ))}
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            style={[styles.toggle, expanded && styles.rowDivider]}
            testID="docs-toggle-unauffaellig"
          >
            <Text style={styles.toggleText}>{okLabel}</Text>
          </Pressable>
        </View>

        {/* Fehlt noch */}
        {missing.length > 0 && (
          <>
            <Text style={[type.monoLabel, styles.sectionLabel]}>FEHLT NOCH · {missing.length}</Text>
            <View style={styles.missingCard}>
              {missing.map((m, i) => (
                <View
                  key={m.id}
                  style={[styles.missingRow, i > 0 && styles.missingDivider]}
                  testID={`missing-row-${m.id}`}
                >
                  <View style={[styles.dot, { backgroundColor: colors.grayInactive }]} />
                  <Text style={styles.missingName} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Pressable
                    onPress={() => requestDoc(m.id, m.name)}
                    accessibilityRole="button"
                    style={styles.anfordern}
                    testID={`anfordern-${m.id}`}
                  >
                    <Text style={styles.anfordernText}>Anfordern</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Two big buttons */}
        <View style={styles.bigBtnRow}>
          <Pressable
            onPress={uploadPhotos}
            accessibilityRole="button"
            style={[styles.bigBtn, styles.bigBtnTeal]}
            testID="btn-upload-photos"
          >
            <Svg width={20} height={20} fill="none" stroke={colors.teal} strokeWidth={1.7}>
              <Rect x={2} y={4} width={16} height={12} rx={2} />
              <Circle cx={7} cy={9} r={1.8} />
              <Path d="M2 14l4.5-4 4 3 3-2.5L18 14" />
            </Svg>
            <Text style={[styles.bigBtnTitle, { color: colors.tealText }]}>Fotos hochladen</Text>
            <Text style={styles.bigBtnSub}>{processingPhotos ? 'analysiert …' : 'KI findet Mängel'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setFlowOpen(true)}
            accessibilityRole="button"
            style={[styles.bigBtn, styles.bigBtnNeutral]}
            testID="btn-upload-doc"
          >
            <Svg width={20} height={20} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
              <Path d="M10 3v10M6 9l4 4 4-4" />
              <Path d="M3 15v2h14v-2" />
            </Svg>
            <Text style={[styles.bigBtnTitle, { color: colors.ink2 }]}>Dokument</Text>
            <Text style={styles.bigBtnSub}>PDF · Datei</Text>
          </Pressable>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      <DocViewer
        doc={activeDoc}
        onClose={() => setActiveDoc(null)}
        onAsk={(d) => {
          setActiveDoc(null);
          onAskDocument(d);
        }}
      />

      <DocUploadFlow
        visible={flowOpen}
        onClose={() => setFlowOpen(false)}
        onApply={onAddDocuments}
        onToast={onToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },

  // DD card
  ddCard: { backgroundColor: colors.dark, borderRadius: radii.card, paddingVertical: 15, paddingHorizontal: 16 },
  ddHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  ddTitle: { fontFamily: fonts.hanken600, fontSize: 13.5, color: '#fff' },
  ddValue: { fontFamily: fonts.mono600, fontSize: 16, color: '#fff' },
  ddTrack: { height: 7, borderRadius: 4, backgroundColor: colors.darkLine, marginTop: 12, overflow: 'hidden' },
  ddFill: { height: '100%', backgroundColor: colors.green },
  ddNote: { fontFamily: fonts.mono400, fontSize: 11, color: '#8f8b83', marginTop: 9 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  sectionLabel: { marginTop: 16, marginBottom: 8, marginHorizontal: 2 },

  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.cardSm,
    paddingHorizontal: 14,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },

  befundRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.ink },
  rowNote: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.muted2, marginTop: 2 },
  badge: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { fontFamily: fonts.mono600, fontSize: 9.5 },

  okRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  okName: { flex: 1, minWidth: 0, fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.ink2 },
  okBadge: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.faint },
  toggle: { alignItems: 'center', paddingVertical: 11 },
  toggleText: { fontFamily: fonts.mono600, fontSize: 11.5, color: colors.tealText },

  missingCard: {
    backgroundColor: '#faf9f7',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d8d5cf',
    borderRadius: radii.cardSm,
    paddingHorizontal: 14,
  },
  missingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  missingDivider: { borderTopWidth: 1, borderTopColor: '#efece7' },
  missingName: { flex: 1, minWidth: 0, fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.muted },
  anfordern: { backgroundColor: colors.greenSoft, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 9 },
  anfordernText: { fontFamily: fonts.mono600, fontSize: 9.5, color: colors.greenText },

  bigBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  bigBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.cardSm,
    backgroundColor: colors.surface,
  },
  bigBtnTeal: { borderColor: '#b6cdc4' },
  bigBtnNeutral: { borderColor: colors.grayInactive },
  bigBtnTitle: { fontFamily: fonts.hanken600, fontSize: 12 },
  bigBtnSub: { fontFamily: fonts.mono400, fontSize: 9.5, color: colors.muted2, textAlign: 'center' },
});
