/**
 * Pipeline ⋮ action menu (bottom sheet) — README "1. Pipeline" ⋮ + Statussemantik.
 * A dark "Neuer Deal" action on top, then the sort options Score / Kaufpreis /
 * Datum, each showing a green check when active. Picking a sort reorders the
 * rows (the sections stay in their fixed order).
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { fonts, type } from '../theme/typography';
import { Sheet } from './Sheet';
import { CheckIcon, PlusThin } from './icons';
import { SORT_LABEL, type SortMode } from '../lib/pipeline';

export interface PipelineActionMenuProps {
  visible: boolean;
  onClose: () => void;
  sortMode: SortMode;
  onSort: (mode: SortMode) => void;
  onNewDeal: () => void;
}

const SORT_ORDER: SortMode[] = ['score', 'kaufpreis', 'datum'];

export function PipelineActionMenu({
  visible,
  onClose,
  sortMode,
  onSort,
  onNewDeal,
}: PipelineActionMenuProps) {
  return (
    <Sheet visible={visible} onClose={onClose} testID="pipe-menu">
      <View style={styles.body}>
        <Pressable
          onPress={onNewDeal}
          accessibilityRole="button"
          style={styles.newDeal}
          testID="pipe-menu-new"
        >
          <PlusThin size={18} color="#fff" />
          <Text style={styles.newDealText}>Neuer Deal</Text>
        </Pressable>

        <Text style={[type.monoLabel, styles.sortLabel]}>SORTIEREN NACH</Text>
        {SORT_ORDER.map((mode) => {
          const active = mode === sortMode;
          return (
            <Pressable
              key={mode}
              onPress={() => onSort(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.sortRow}
              testID={`pipe-menu-sort-${mode}`}
            >
              <Text style={styles.sortRowLabel}>{SORT_LABEL[mode]}</Text>
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
  newDeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.dark,
    borderRadius: 13,
    padding: 14,
  },
  newDealText: { fontFamily: fonts.hanken600, fontSize: 13.5, color: '#fff' },
  sortLabel: { paddingHorizontal: 4, paddingTop: 16, paddingBottom: 6 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  sortRowLabel: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.ink },
});
