/**
 * Status-ändern sheet — README "7. Weitere Sheets · Status ändern".
 * Neu · In Prüfung · Verhandlung · Gekauft · Verworfen, each with its Ampel dot
 * and a green check on the active one. Picking a status writes `dealStatus` to
 * the store, which regroups the pipeline (Verworfen renders reduced with "—").
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DealStatus } from '@dealpilot/core';
import { colors } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { Sheet } from '../Sheet';
import { CheckIcon } from '../icons';

export interface StatusSheetProps {
  visible: boolean;
  onClose: () => void;
  status: DealStatus;
  onPick: (status: DealStatus) => void;
}

/** Options in the design's order with their Statussemantik dot colour. */
const OPTIONS: { key: DealStatus; label: string; col: string }[] = [
  { key: 'neu', label: 'Neu', col: colors.muted },
  { key: 'pruefung', label: 'In Prüfung', col: colors.teal },
  { key: 'verhandlung', label: 'Verhandlung', col: colors.yellow },
  { key: 'gekauft', label: 'Gekauft', col: colors.greenText },
  { key: 'verworfen', label: 'Verworfen', col: colors.red },
];

export function StatusSheet({ visible, onClose, status, onPick }: StatusSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} testID="status-sheet">
      <View style={styles.body}>
        <Text style={styles.title}>Status ändern</Text>
        {OPTIONS.map((o) => {
          const active = o.key === status;
          return (
            <Pressable
              key={o.key}
              onPress={() => onPick(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.row}
              testID={`status-opt-${o.key}`}
            >
              <View style={[styles.dot, { backgroundColor: o.col }]} />
              <Text style={styles.label}>{o.label}</Text>
              {active && <CheckIcon size={16} color={colors.greenText} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 12 },
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 17,
    letterSpacing: -0.17,
    color: colors.ink,
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 14,
    marginBottom: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  label: { flex: 1, fontFamily: fonts.hanken600, fontSize: 13.5, color: colors.ink },
});
