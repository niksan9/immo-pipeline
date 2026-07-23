/**
 * Reusable segmented control. Active segment = white pill with a soft shadow,
 * inactive = faint text on the neutral track (per the handoff "Interactions").
 * Used for the Kalkulation scenario switch and the Automatik/Pro-Jahr toggle.
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/typography';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  /** "lg" = full-width scenario switch, "sm" = compact inline toggle. */
  size?: 'lg' | 'sm';
  testIDPrefix?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'lg',
  testIDPrefix,
}: SegmentedProps<T>) {
  const sm = size === 'sm';
  return (
    <View style={[styles.track, sm ? styles.trackSm : styles.trackLg]}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={testIDPrefix ? `${testIDPrefix}-${opt.key}` : undefined}
            style={[
              sm ? styles.segSm : styles.segLg,
              active && styles.segActive,
            ]}
          >
            <Text
              style={[
                sm ? styles.labelSm : styles.labelLg,
                { color: active ? colors.ink : colors.muted2 },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.chipBgAlt,
  },
  trackLg: { borderRadius: 12, padding: 3, gap: 3 },
  trackSm: { borderRadius: 9, padding: 2, gap: 2 },
  segLg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segSm: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  segActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1,
  },
  labelLg: { fontFamily: fonts.hanken600, fontSize: 12.5 },
  labelSm: { fontFamily: fonts.hanken600, fontSize: 10.5 },
});
