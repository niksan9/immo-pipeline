/**
 * Dokument-Viewer overlay — README "6. Dokument-Viewer".
 *
 * Full-screen fade-in overlay: a dark KI-summary card, for findings the quoted
 * Fundstelle + source (same styling as the Risiko-Detail Fundstelle block), a
 * placeholder document preview, and two buttons — "Zum Dokument fragen" (stub
 * toast; the chat comes later) and "Fertig". Purely presentational; the active
 * document is owned by the Dokumente tab.
 */

import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { badgeStyle, pagesLabel } from '../../lib/docs';
import type { DealDocument } from '../../data/documents';
import { BackIcon, BubbleIcon, DocIcon } from '../icons';

export interface DocViewerProps {
  /** The document to show; when null the overlay is not rendered. */
  doc: DealDocument | null;
  onClose: () => void;
  /** Stub: "Zum Dokument fragen" (chat is a later phase). */
  onAsk: (doc: DealDocument) => void;
}

export function DocViewer({ doc, onClose, onAsk }: DocViewerProps) {
  const insets = useSafeAreaInsets();
  if (!doc) return null;

  const badge = badgeStyle(doc.badge);
  const hasQuote = !!doc.quote;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]} testID="doc-viewer">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
          >
            <BackIcon size={18} />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.name} numberOfLines={1}>
              {doc.name}
            </Text>
            <Text style={styles.pages}>{pagesLabel(doc.pages)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]} testID="doc-viewer-badge">
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          testID="doc-viewer-scroll"
        >
          {/* KI summary (dark card) */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHead}>
              <View style={styles.summaryDot} />
              <Text style={styles.summaryLabel}>KI-ZUSAMMENFASSUNG</Text>
            </View>
            <Text style={styles.summaryText}>{doc.summary}</Text>
          </View>

          {/* Fundstelle (findings with a quote only) */}
          {hasQuote && (
            <>
              <Text style={styles.sectionLabel}>FUNDSTELLE</Text>
              <View
                style={[styles.fundCard, { borderLeftColor: badge.dot }]}
                testID="doc-viewer-fundstelle"
              >
                <Text style={styles.fundQuote}>{doc.quote}</Text>
                <View style={styles.fundSourceRow}>
                  <DocIcon size={12} color={colors.muted2} />
                  <Text style={styles.fundSource}>
                    {doc.name}
                    {doc.source ? ` · ${doc.source}` : ''}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Document preview placeholder */}
          <Text style={styles.sectionLabel}>DOKUMENT</Text>
          <View style={styles.previewCard} testID="doc-viewer-preview">
            <View style={[styles.line, { width: '52%', backgroundColor: colors.lineSoftAlt }]} />
            <View style={[styles.line, { width: '100%' }]} />
            <View style={[styles.line, { width: '96%' }]} />
            <View style={[styles.line, { width: '88%' }]} />
            <View style={[styles.line, { width: '92%', marginBottom: 6 }]} />
            <View
              style={[styles.line, { width: '40%', backgroundColor: colors.lineSoftAlt, marginTop: 4 }]}
            />
            <View style={[styles.line, { width: '100%' }]} />
            <View style={[styles.line, { width: '70%' }]} />
            <Text style={styles.previewNote}>Vorschau · Original öffnen</Text>
          </View>
        </ScrollView>

        {/* Footer buttons */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => onAsk(doc)}
            accessibilityRole="button"
            style={styles.askBtn}
            testID="doc-viewer-ask"
          >
            <BubbleIcon size={15} color={colors.tealText} />
            <Text style={styles.askText}>Zum Dokument fragen</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={styles.doneBtn}
            testID="doc-viewer-done"
          >
            <Text style={styles.doneText}>Fertig</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bricolage700, fontSize: 15, color: colors.ink },
  pages: { fontFamily: fonts.mono400, fontSize: 10, color: colors.muted2, marginTop: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.mono600, fontSize: 9.5 },

  scroll: { flex: 1 },
  content: { padding: 16 },

  summaryCard: { backgroundColor: colors.dark, borderRadius: radii.cardSm, padding: 15 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  summaryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.greenLight },
  summaryLabel: {
    fontFamily: fonts.mono600,
    fontSize: 9.5,
    letterSpacing: 1.1,
    color: '#8f8b83',
  },
  summaryText: {
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    lineHeight: 21,
    color: '#f4f2ef',
    marginTop: 9,
  },

  sectionLabel: {
    ...type.monoLabel,
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  fundCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  fundQuote: {
    fontFamily: fonts.hanken400,
    fontSize: 13,
    lineHeight: 21,
    fontStyle: 'italic',
    color: colors.ink2,
  },
  fundSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  fundSource: { fontFamily: fonts.mono500, fontSize: 10.5, color: colors.muted },

  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 9,
  },
  line: { height: 8, borderRadius: 3, backgroundColor: '#f1efec' },
  previewNote: {
    fontFamily: fonts.mono400,
    fontSize: 10,
    color: colors.faintAlt,
    textAlign: 'center',
    marginTop: 8,
  },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  askBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#d8d5cf',
    borderRadius: radii.chipLg,
  },
  askText: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.tealText },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: colors.dark,
    borderRadius: radii.chipLg,
  },
  doneText: { fontFamily: fonts.hanken600, fontSize: 13, color: '#fff' },
});
