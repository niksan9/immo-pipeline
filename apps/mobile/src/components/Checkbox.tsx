/**
 * Reusable consent checkbox (rounded square + white check). Used by the
 * onboarding AGB gate (dark box) and the KI-Hinweis "Verstanden" gate (green
 * box). Presentational: the parent owns `checked` and the toggle.
 */

import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/tokens';

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  /** Box fill when checked (default dark ink). */
  checkedColor?: string;
  children: React.ReactNode;
  testID?: string;
  /** Vertical alignment of the box against multi-line labels. */
  align?: 'center' | 'flex-start';
}

export function Checkbox({
  checked,
  onToggle,
  checkedColor = colors.dark,
  children,
  testID,
  align = 'center',
}: CheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.row, { alignItems: align }]}
      testID={testID}
    >
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: checkedColor, borderColor: checkedColor }
            : styles.boxEmpty,
          align === 'flex-start' && { marginTop: 1 },
        ]}
      >
        {checked && (
          <Svg width={12} height={12} viewBox="0 0 11 11" fill="none">
            <Path
              d="M2 6l2.5 2.5L9 3"
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  boxEmpty: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#cfcbc3',
  },
});
