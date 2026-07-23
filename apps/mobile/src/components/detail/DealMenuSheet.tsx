/**
 * Deal-Detail ⋮ context menu — README "7. Kontextmenü (⋮)".
 * Status ändern (shows the current status) · Stammdaten bearbeiten (→ Objektdaten
 * sheet) · Zusammenarbeiten · Deal teilen (digitales Exposé — stub toast) ·
 * Löschen (→ confirm dialog handled by the screen).
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { DealStatus } from '@dealpilot/core';
import { colors } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { Sheet } from '../Sheet';
import { ChevronRight } from '../icons';
import { SECTION_LABEL } from '../../lib/pipeline';

export interface DealMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Deal title (street or city) shown as the sheet caption. */
  title: string;
  status: DealStatus;
  onStatus: () => void;
  onEdit: () => void;
  onCollab: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function DealMenuSheet({
  visible,
  onClose,
  title,
  status,
  onStatus,
  onEdit,
  onCollab,
  onShare,
  onDelete,
}: DealMenuSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} testID="deal-menu">
      <View style={styles.body}>
        <Text style={styles.caption}>{title}</Text>

        <Pressable onPress={onStatus} style={styles.row} accessibilityRole="button" testID="menu-status">
          <Svg width={19} height={19} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
            <Path d="M3 10l3 3 5-7" />
            <Circle cx={10} cy={10} r={8} />
          </Svg>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Status ändern</Text>
            <Text style={styles.rowSub}>aktuell: {SECTION_LABEL[status]}</Text>
          </View>
          <ChevronRight size={14} />
        </Pressable>

        <Pressable onPress={onEdit} style={styles.row} accessibilityRole="button" testID="menu-edit">
          <Svg width={19} height={19} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
            <Path d="M12 3l3 3-8.5 8.5L3 15l.5-3.5z" />
          </Svg>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Stammdaten bearbeiten</Text>
            <Text style={styles.rowSub}>Name, Angebotspreis, Größe, Adresse …</Text>
          </View>
        </Pressable>

        <Pressable onPress={onCollab} style={styles.row} accessibilityRole="button" testID="menu-collab">
          <Svg width={19} height={19} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
            <Circle cx={7} cy={6} r={2.6} />
            <Circle cx={13.5} cy={7.5} r={2.1} />
            <Path d="M2.5 15.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M12 11.5c2 0 4 1.2 4 3.5" />
          </Svg>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Zusammenarbeiten</Text>
            <Text style={styles.rowSub}>Deal gemeinsam bearbeiten</Text>
          </View>
        </Pressable>

        <Pressable onPress={onShare} style={styles.row} accessibilityRole="button" testID="menu-share">
          <Svg width={19} height={19} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
            <Circle cx={5} cy={9.5} r={2.2} />
            <Circle cx={14} cy={4.5} r={2.2} />
            <Circle cx={14} cy={14.5} r={2.2} />
            <Path d="M7 8.5l5-3M7 10.5l5 3" />
          </Svg>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Deal teilen</Text>
            <Text style={styles.rowSub}>Digitales Exposé für Bank & andere</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={[styles.row, styles.rowDanger]}
          accessibilityRole="button"
          testID="menu-delete"
        >
          <Svg width={19} height={19} fill="none" stroke={colors.red} strokeWidth={1.7}>
            <Path d="M3.5 5h12M7 5V3.5h5V5M5 5l.8 10.5h8.4L15 5" />
          </Svg>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.red }]}>Löschen</Text>
          </View>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 12 },
  caption: {
    fontFamily: fonts.hanken600,
    fontSize: 15,
    color: colors.ink,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 14,
    marginTop: 9,
  },
  rowDanger: { borderColor: '#f0dcd6' },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.hanken600, fontSize: 13.5, color: colors.ink },
  rowSub: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.muted2, marginTop: 1 },
});
