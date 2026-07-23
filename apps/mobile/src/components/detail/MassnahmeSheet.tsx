/**
 * Maßnahme-Sheet: capture a value-add measure (title, year, one-off invest,
 * monthly uplift). On submit it is handed to the store, which recomputes the
 * rent schedule and cashflows.
 */

import * as React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Measure } from '@dealpilot/core';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { SCHEDULE_YEAR_COUNT } from '../../lib/detail';
import { Sheet } from '../Sheet';
import { MinusIcon, PlusStepIcon } from '../icons';

export interface MassnahmeSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (measure: Measure) => void;
}

export function MassnahmeSheet({ visible, onClose, onAdd }: MassnahmeSheetProps) {
  const [title, setTitle] = React.useState('');
  const [invest, setInvest] = React.useState('5000');
  const [uplift, setUplift] = React.useState('150');
  const [year, setYear] = React.useState(2);

  // Reset the draft whenever the sheet is (re)opened.
  React.useEffect(() => {
    if (visible) {
      setTitle('');
      setInvest('5000');
      setUplift('150');
      setYear(2);
    }
  }, [visible]);

  const submit = () => {
    onAdd({
      id: Date.now(),
      title: title.trim() || 'Maßnahme',
      year,
      invest: parseInt(invest, 10) || 0,
      uplift: parseInt(uplift, 10) || 0,
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="massnahme-sheet">
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>M</Text>
          </View>
          <Text style={styles.title}>Maßnahme hinzufügen</Text>
        </View>
        <Text style={styles.subtitle}>
          Einmalige Investition, die ab einem Jahr die Miete erhöht.
        </Text>

        <Text style={styles.label}>TITEL</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="z. B. Bad-Sanierung"
          placeholderTextColor={colors.faint}
          style={styles.input}
          testID="measure-title"
        />

        <View style={styles.pairRow}>
          <View style={styles.pairCol}>
            <Text style={styles.label}>INVESTITION €</Text>
            <TextInput
              value={invest}
              onChangeText={setInvest}
              keyboardType="numeric"
              style={styles.input}
              testID="measure-invest"
            />
          </View>
          <View style={styles.pairCol}>
            <Text style={styles.label}>MIETE +€/MO</Text>
            <TextInput
              value={uplift}
              onChangeText={setUplift}
              keyboardType="numeric"
              style={styles.input}
              testID="measure-uplift"
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>AB JAHR</Text>
        <View style={styles.yearRow}>
          <Pressable
            style={styles.stepper}
            onPress={() => setYear((y) => Math.max(1, y - 1))}
            accessibilityRole="button"
            accessibilityLabel="Jahr senken"
            testID="measure-year-dec"
          >
            <MinusIcon />
          </Pressable>
          <Text style={styles.yearValue} testID="measure-year">
            Jahr {year}
          </Text>
          <Pressable
            style={styles.stepper}
            onPress={() => setYear((y) => Math.min(SCHEDULE_YEAR_COUNT, y + 1))}
            accessibilityRole="button"
            accessibilityLabel="Jahr erhöhen"
            testID="measure-year-inc"
          >
            <PlusStepIcon />
          </Pressable>
        </View>

        <Pressable
          style={styles.submit}
          onPress={submit}
          accessibilityRole="button"
          testID="measure-submit"
        >
          <Text style={styles.submitText}>Maßnahme übernehmen</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.mono600, fontSize: 10, color: '#fff' },
  title: { fontFamily: fonts.bricolage700, fontSize: 19, letterSpacing: -0.19, color: colors.ink },
  subtitle: { fontFamily: fonts.hanken400, fontSize: 12, color: colors.muted, marginBottom: 16 },
  label: { ...type.monoLabel, color: colors.muted2, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: fonts.hanken500,
    fontSize: 14,
    color: colors.ink,
  },
  pairRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  pairCol: { flex: 1 },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearValue: { flex: 1, textAlign: 'center', fontFamily: fonts.mono600, fontSize: 22, color: colors.ink },
  submit: {
    marginTop: 22,
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.teal,
    borderRadius: radii.buttonLg,
  },
  submitText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#fff' },
});
