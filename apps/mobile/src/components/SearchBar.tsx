import * as React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
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
  // On the paper-coloured header the search field is a floating white pill with
  // a soft drop shadow (matches the "4b" prototype), not a bordered bar.
  wrap: {
    paddingHorizontal: 4,
    marginTop: 11,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderRadius: radii.chip,
    paddingHorizontal: 13,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  input: {
    flex: 1,
    padding: 0,
    ...type.input,
  },
});
