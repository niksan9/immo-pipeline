/**
 * Objektdaten-bearbeiten sheet — README "7. Objektdaten bearbeiten".
 * Art · Straße · Ort · m² · Baujahr · Kaufpreis · Kaltmiete · Makler-Provision %
 * (+ "provisionsfrei" toggle → maklerPct 0). Saving writes the master data back
 * to the store, which re-derives every metric (calc, score, pipeline row).
 */

import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { DealState, Objektart } from '@dealpilot/core';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { Sheet } from '../Sheet';
import type { ObjektdatenInput } from '../../data/store';

export interface ObjektdatenSheetProps {
  visible: boolean;
  onClose: () => void;
  state: DealState;
  onSave: (patch: ObjektdatenInput) => void;
}

const ART_OPTIONS: Objektart[] = ['ETW', 'MFH', 'Haus'];
/** The provisionsfrei toggle restores this default rate when re-enabled. */
const DEFAULT_MAKLER_PCT = 0.0357;

interface Draft {
  objektart: Objektart;
  address: string;
  ort: string;
  qm: string;
  baujahr: string;
  kaufpreis: string;
  rent: string;
  /** Percent value shown in the field (e.g. "3,57"); 0 = provisionsfrei. */
  maklerPctPct: number;
}

function draftFrom(state: DealState): Draft {
  const { deal } = state;
  return {
    objektart: deal.objektart,
    address: deal.address ?? '',
    ort: deal.ort,
    qm: String(deal.qm),
    baujahr: String(deal.baujahr),
    kaufpreis: String(deal.kaufpreis),
    rent: String(deal.rent),
    maklerPctPct: +(state.financing.maklerPct * 100).toFixed(2),
  };
}

function parseIntLoose(text: string): number {
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function ObjektdatenSheet({ visible, onClose, state, onSave }: ObjektdatenSheetProps) {
  const [draft, setDraft] = React.useState<Draft>(() => draftFrom(state));

  // Reload the draft from the live state each time the sheet opens.
  React.useEffect(() => {
    if (visible) setDraft(draftFrom(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const provisionsfrei = draft.maklerPctPct === 0;

  const save = () => {
    onSave({
      objektart: draft.objektart,
      address: draft.address,
      ort: draft.ort,
      qm: parseIntLoose(draft.qm),
      baujahr: parseIntLoose(draft.baujahr),
      kaufpreis: parseIntLoose(draft.kaufpreis),
      rent: parseIntLoose(draft.rent),
      maklerPct: draft.maklerPctPct / 100,
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="objektdaten-sheet">
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Objektdaten</Text>
        <Text style={styles.subtitle}>
          Manuell eingeben oder korrigieren – fließt in Kopf & Kalkulation.
        </Text>

        <Text style={[type.monoLabel, styles.label]}>ART</Text>
        <View style={styles.segTrack}>
          {ART_OPTIONS.map((opt) => {
            const active = opt === draft.objektart;
            return (
              <Pressable
                key={opt}
                onPress={() => patch('objektart', opt)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.seg, active && styles.segActive]}
                testID={`obj-art-${opt}`}
              >
                <Text style={[styles.segLabel, active && styles.segLabelActive]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[type.monoLabel, styles.label]}>STRASSE</Text>
        <TextInput
          value={draft.address}
          onChangeText={(t) => patch('address', t)}
          placeholder="Straße & Nr."
          placeholderTextColor={colors.faintAlt}
          style={styles.input}
          testID="obj-street"
        />

        <Text style={[type.monoLabel, styles.label]}>ORT</Text>
        <TextInput
          value={draft.ort}
          onChangeText={(t) => patch('ort', t)}
          placeholder="Ort"
          placeholderTextColor={colors.faintAlt}
          style={styles.input}
          testID="obj-ort"
        />

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[type.monoLabel, styles.label]}>WOHNFLÄCHE m²</Text>
            <TextInput
              value={draft.qm}
              onChangeText={(t) => patch('qm', t)}
              keyboardType="numeric"
              style={[styles.input, styles.mono]}
              testID="obj-qm"
            />
          </View>
          <View style={styles.col}>
            <Text style={[type.monoLabel, styles.label]}>BAUJAHR</Text>
            <TextInput
              value={draft.baujahr}
              onChangeText={(t) => patch('baujahr', t)}
              keyboardType="numeric"
              style={[styles.input, styles.mono]}
              testID="obj-baujahr"
            />
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[type.monoLabel, styles.label]}>KAUFPREIS €</Text>
            <TextInput
              value={draft.kaufpreis}
              onChangeText={(t) => patch('kaufpreis', t)}
              keyboardType="numeric"
              style={[styles.input, styles.mono]}
              testID="obj-kaufpreis"
            />
          </View>
          <View style={styles.col}>
            <Text style={[type.monoLabel, styles.label]}>KALTMIETE €/MO</Text>
            <TextInput
              value={draft.rent}
              onChangeText={(t) => patch('rent', t)}
              keyboardType="numeric"
              style={[styles.input, styles.mono]}
              testID="obj-rent"
            />
          </View>
        </View>

        <View style={styles.maklerHead}>
          <Text style={type.monoLabel}>MAKLER-PROVISION %</Text>
          <Pressable
            onPress={() =>
              patch('maklerPctPct', provisionsfrei ? DEFAULT_MAKLER_PCT * 100 : 0)
            }
            accessibilityRole="button"
            accessibilityState={{ selected: provisionsfrei }}
            style={[styles.proviChip, provisionsfrei && styles.proviChipOn]}
            testID="obj-provisionsfrei"
          >
            <Text style={[styles.proviText, provisionsfrei && styles.proviTextOn]}>
              provisionsfrei
            </Text>
          </Pressable>
        </View>
        <TextInput
          value={
            draft.maklerPctPct === 0
              ? '0'
              : String(draft.maklerPctPct).replace('.', ',')
          }
          onChangeText={(t) => {
            const n = parseFloat(t.replace(',', '.').replace(/[^0-9.]/g, ''));
            patch('maklerPctPct', Number.isFinite(n) ? n : 0);
          }}
          keyboardType="numeric"
          style={[styles.input, styles.mono]}
          testID="obj-makler"
        />

        <Pressable
          onPress={save}
          accessibilityRole="button"
          style={styles.saveBtn}
          testID="obj-save"
        >
          <Text style={styles.saveText}>Speichern</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 19,
    letterSpacing: -0.19,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.hanken400,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  label: { marginTop: 14, marginBottom: 6 },
  segTrack: {
    flexDirection: 'row',
    backgroundColor: colors.chipBgAlt,
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  segActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1,
  },
  segLabel: { fontFamily: fonts.hanken600, fontSize: 12, color: colors.muted2 },
  segLabelActive: { color: colors.ink },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontFamily: fonts.hanken400,
    fontSize: 13,
    color: colors.ink,
  },
  mono: { fontFamily: fonts.mono600 },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  maklerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  proviChip: {
    backgroundColor: colors.chipBgAlt,
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  proviChipOn: { backgroundColor: colors.teal },
  proviText: { fontFamily: fonts.mono600, fontSize: 10.5, color: colors.muted2 },
  proviTextOn: { color: '#fff' },
  saveBtn: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: colors.dark,
    borderRadius: radii.buttonLg,
  },
  saveText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#fff' },
});
