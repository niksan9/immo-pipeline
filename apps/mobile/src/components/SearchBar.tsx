import * as React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { type } from '../theme/typography';
import { SearchIcon } from './icons';

export interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
}

/** Pipeline search bar: chip-bg pill, magnifier, free-text filter. */
export function SearchBar({ value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.field}>
        <SearchIcon />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Deals durchsuchen – Ort, Straße, Typ …"
          placeholderTextColor={colors.faint}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Deals durchsuchen"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.chipBg,
    borderRadius: radii.chip,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    padding: 0,
    ...type.input,
  },
});
