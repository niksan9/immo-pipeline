/**
 * Placeholder for the not-yet-built Dokumente / Chat tabs — styled to match the
 * app so the tab bar is fully navigable ("folgt").
 */

import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, radii } from '../../theme/tokens';
import { fonts } from '../../theme/typography';

export interface StubTabProps {
  title: string;
  note: string;
  variant: 'docs' | 'chat';
  testID?: string;
}

export function StubTab({ title, note, variant, testID }: StubTabProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.icon}>
        {variant === 'docs' ? (
          <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
            <Rect x={6} y={4} width={16} height={20} rx={2.5} stroke={colors.faint} strokeWidth={1.8} />
            <Path d="M10 10h8M10 14h8M10 18h5" stroke={colors.faint} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        ) : (
          <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
            <Path
              d="M5 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H11l-5 4v-4H7a2 2 0 0 1-2-2z"
              stroke={colors.faint}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
      <View style={styles.chip}>
        <Text style={styles.chipText}>FOLGT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.bricolage700, fontSize: 17, color: colors.ink, marginTop: 4 },
  note: { fontFamily: fonts.hanken400, fontSize: 13, color: colors.muted, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  chip: {
    marginTop: 4,
    backgroundColor: colors.chipBg,
    borderRadius: radii.chipSm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontFamily: fonts.mono600, fontSize: 10, letterSpacing: 1, color: colors.muted2 },
});
