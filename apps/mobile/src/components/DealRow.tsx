import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/typography';
import type { DealRowVM } from '../lib/pipeline';
import { AvatarStack } from './Avatar';

export interface DealRowProps {
  row: DealRowVM;
  onPress?: (id: string) => void;
}

/**
 * Pipeline deal row ("4b"): a rounded 44×44 score tile (softBg fill, accent-
 * coloured score number) followed by the title (`Typ · Straße`) and a single
 * mono line `Preis · Rendite · Risiko` (risk word in the score colour). Shared
 * deals show a collaborator avatar stack on the right. Discarded (verworfen)
 * rows render dimmed with a grey tile showing "—" and the discard note as the
 * mono line.
 */
export function DealRow({ row, onPress }: DealRowProps) {
  const handlePress = React.useCallback(() => onPress?.(row.id), [onPress, row.id]);

  if (row.discarded) {
    return (
      <Pressable
        onPress={handlePress}
        testID={`deal-row-${row.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${row.title}, verworfen`}
        style={[styles.container, styles.discarded]}
      >
        <View style={[styles.tile, styles.tileDiscarded]}>
          <Text style={styles.tileDash}>—</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {row.title}
          </Text>
          <Text style={styles.discardNote} numberOfLines={1}>
            {row.subtitle}
          </Text>
        </View>
      </Pressable>
    );
  }

  const style = row.style!;

  return (
    <Pressable
      onPress={handlePress}
      testID={`deal-row-${row.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, Score ${row.scoreStr}`}
      style={styles.container}
    >
      <View style={[styles.tile, { backgroundColor: style.softBg }]}>
        <Text style={[styles.tileScore, { color: style.accent }]}>
          {row.scoreStr}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.kpiLine} numberOfLines={1}>
          {row.priceStr} · {row.yieldStr}
          {row.hasRisk && (
            <Text style={{ color: style.accent }}> · {row.riskLabelStr}</Text>
          )}
        </Text>
      </View>

      {row.sharedInitials.length > 0 && (
        <AvatarStack initials={row.sharedInitials} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  discarded: { opacity: 0.62 },

  tile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDiscarded: { backgroundColor: '#eee9e1' },
  tileScore: { fontFamily: fonts.mono600, fontSize: 17, lineHeight: 20 },
  tileDash: { fontFamily: fonts.mono600, fontSize: 18, color: colors.faintAlt },

  content: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.hanken600, fontSize: 14, color: colors.ink },
  kpiLine: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  discardNote: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.muted2,
    marginTop: 2,
  },
});
