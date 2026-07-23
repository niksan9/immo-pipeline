/**
 * Annahmen-Sheet: edit the deal's calc inputs. Every control writes straight to
 * the store, so the Kalkulation tab behind it re-derives all metrics live.
 * Kaufpreis is edited per scenario (stepper + discount slider, min 80 % of the
 * offer); Sollzins/Tilgung are sliders; Eigenkapital + costs + AfA are inputs.
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
import {
  calc,
  formatEUR,
  formatPercent,
  formatSignedEUR,
  type DealState,
} from '@dealpilot/core';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { discount, priceMin, SCENARIO_LABEL } from '../../lib/detail';
import { Sheet } from '../Sheet';
import { Slider } from '../Slider';
import { MinusIcon, PlusStepIcon } from '../icons';
import type { CalcActions } from './CalcTab';

export interface AnnahmenSheetProps {
  visible: boolean;
  onClose: () => void;
  state: DealState;
  actions: CalcActions;
  onToast: (msg: string) => void;
}

const TAX_PRESETS = [
  { label: 'GmbH', value: 15.8 },
  { label: '30 %', value: 30 },
  { label: '42 %', value: 42 },
  { label: '45 %', value: 45 },
];

export function AnnahmenSheet({
  visible,
  onClose,
  state,
  actions,
}: AnnahmenSheetProps) {
  const c = calc(state);
  const scenario = state.scenario;
  const offer = state.deal.kaufpreis;
  const price = state.priceByCase[scenario];
  const min = priceMin(offer);
  const disc = discount(offer, price);
  const nkSum = state.costs.hausgeld + state.costs.ruecklage + state.costs.verwaltung;

  const setPrice = (p: number) =>
    actions.setScenarioPrice(scenario, Math.max(min, Math.min(offer, p)));

  return (
    <Sheet visible={visible} onClose={onClose} testID="annahmen-sheet">
      <View style={styles.header}>
        <Text style={styles.title}>Annahmen · {SCENARIO_LABEL[scenario]}</Text>
        <Pressable onPress={onClose} accessibilityRole="button">
          <Text style={styles.fertig}>Fertig</Text>
        </Pressable>
      </View>

      <View style={styles.vermoegenChip}>
        <Text style={styles.vermoegenLabel}>VERMÖGENSZUWACHS / MO</Text>
        <Text style={styles.vermoegenValue} testID="sheet-vermoegen">
          {formatSignedEUR(c.vermoegenszuwachs)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Kaufpreis */}
        <Text style={styles.label}>KAUFPREIS</Text>
        <View style={styles.priceRow}>
          <Pressable
            style={styles.stepper}
            onPress={() => setPrice(price - 1000)}
            accessibilityRole="button"
            accessibilityLabel="Kaufpreis senken"
            testID="price-dec"
          >
            <MinusIcon />
          </Pressable>
          <View style={styles.priceBox}>
            <Text style={styles.priceNum} testID="sheet-price">
              {formatEUR(price)}
            </Text>
          </View>
          <Pressable
            style={styles.stepper}
            onPress={() => setPrice(price + 1000)}
            accessibilityRole="button"
            accessibilityLabel="Kaufpreis erhöhen"
            testID="price-inc"
          >
            <PlusStepIcon />
          </Pressable>
        </View>
        <Slider
          min={min}
          max={offer}
          step={1000}
          value={price}
          onValueChange={setPrice}
          testID="slider-price"
        />
        <View style={styles.rowBetween}>
          <Text style={styles.smallMono}>Rabatt {disc.str}</Text>
          <Text style={styles.smallMono}>Angebot {formatEUR(offer)}</Text>
        </View>

        {/* Sollzins */}
        <View style={styles.sliderHead}>
          <Text style={styles.sliderLabel}>Sollzins</Text>
          <Text style={styles.sliderValue}>{formatPercent(state.financing.zins)}</Text>
        </View>
        <Slider
          min={2}
          max={6}
          step={0.1}
          value={state.financing.zins}
          onValueChange={(v) => actions.patchFinancing({ zins: v })}
          testID="slider-zins"
        />

        {/* Tilgung */}
        <View style={styles.sliderHead}>
          <Text style={styles.sliderLabel}>Anf. Tilgung</Text>
          <Text style={styles.sliderValue}>{formatPercent(state.financing.tilg)}</Text>
        </View>
        <Slider
          min={1}
          max={4}
          step={0.1}
          value={state.financing.tilg}
          onValueChange={(v) => actions.patchFinancing({ tilg: v })}
          testID="slider-tilg"
        />

        {/* Eigenkapital */}
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>
            Eigenkapital <Text style={styles.hintInline}>0 – GIK</Text>
          </Text>
          <NumberInput
            value={state.financing.ek}
            onChange={(n) => actions.patchFinancing({ ek: n })}
            testID="input-ek"
            width={120}
          />
        </View>

        {/* Nicht umlegbare Kosten */}
        <View style={styles.rowBetween}>
          <Text style={[type.monoLabel, { marginTop: 22 }]}>NICHT UMLEGBARE KOSTEN · €/MO</Text>
          <Text style={[styles.sumMono, { marginTop: 22 }]}>Σ {formatEUR(nkSum)}</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>Hausgeld</Text>
          <NumberInput
            value={state.costs.hausgeld}
            onChange={(n) => actions.patchCosts({ hausgeld: n })}
            testID="input-hausgeld"
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>Instandhaltungsrücklage</Text>
          <NumberInput
            value={state.costs.ruecklage}
            onChange={(n) => actions.patchCosts({ ruecklage: n })}
            testID="input-ruecklage"
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>Verwaltung</Text>
          <NumberInput
            value={state.costs.verwaltung}
            onChange={(n) => actions.patchCosts({ verwaltung: n })}
            testID="input-verwaltung"
          />
        </View>
        <View style={styles.sliderHead}>
          <Text style={styles.sliderLabel}>Kostensteigerung p. a.</Text>
          <Text style={styles.sliderValue}>{formatPercent(state.costGrowth)}</Text>
        </View>
        <Slider
          min={0}
          max={5}
          step={0.1}
          value={state.costGrowth}
          onValueChange={(v) => actions.patchAssumptions({ costGrowth: v })}
          color={colors.teal}
          testID="slider-costgrowth"
        />

        {/* Wertzuwachs */}
        <View style={[styles.rowBetween, { marginTop: 22 }]}>
          <Text style={type.monoLabel}>WERTZUWACHS IMMOBILIE P. A.</Text>
          <Text style={styles.sliderValue}>{formatPercent(state.wertZuwachs)}</Text>
        </View>
        <Slider
          min={0}
          max={5}
          step={0.1}
          value={state.wertZuwachs}
          onValueChange={(v) => actions.patchAssumptions({ wertZuwachs: v })}
          color={colors.teal}
          testID="slider-wertzuwachs"
        />

        {/* AfA */}
        <View style={[styles.rowBetween, { marginTop: 22 }]}>
          <Text style={type.monoLabel}>ABSCHREIBUNG (AfA)</Text>
          <Text style={styles.afaHint}>{formatEUR(c.afaJahr)} / Jahr</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>
            Gebäudewert <Text style={styles.hintInline}>ohne Grund</Text>
          </Text>
          <NumberInput
            value={state.gebaeudewert}
            onChange={(n) => actions.patchAssumptions({ gebaeudewert: n })}
            testID="input-gebaeudewert"
            width={118}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>
            AfA-Satz <Text style={styles.hintInline}>2 % ab 1925 · 3 % ab 2023</Text>
          </Text>
          <NumberInput
            value={state.afaSatz}
            onChange={(n) => actions.patchAssumptions({ afaSatz: n })}
            decimals
            testID="input-afasatz"
            width={78}
          />
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.sliderLabel}>Grenzsteuersatz</Text>
          <NumberInput
            value={state.steuersatz}
            onChange={(n) => actions.patchAssumptions({ steuersatz: n })}
            decimals
            testID="input-steuersatz"
            width={78}
          />
        </View>
        <View style={styles.presets}>
          {TAX_PRESETS.map((p) => {
            const active = Math.abs(state.steuersatz - p.value) < 0.05;
            return (
              <Pressable
                key={p.label}
                onPress={() => actions.patchAssumptions({ steuersatz: p.value })}
                style={[styles.preset, active && styles.presetActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.presetLabel, active && { color: colors.ink }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.doneBtn} onPress={onClose} accessibilityRole="button">
          <Text style={styles.doneBtnText}>Fertig</Text>
        </Pressable>
      </ScrollView>
    </Sheet>
  );
}

function NumberInput({
  value,
  onChange,
  decimals,
  width = 88,
  testID,
}: {
  value: number;
  onChange: (n: number) => void;
  decimals?: boolean;
  width?: number;
  testID?: string;
}) {
  const display = decimals ? String(value).replace('.', ',') : String(Math.round(value));
  return (
    <TextInput
      testID={testID}
      value={display}
      keyboardType="numeric"
      onChangeText={(t) => {
        const cleaned = t.replace(',', '.').replace(/[^0-9.]/g, '');
        const n = decimals ? parseFloat(cleaned) : parseInt(cleaned, 10);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      style={[styles.input, { width }]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: fonts.bricolage700, fontSize: 18, letterSpacing: -0.18, color: colors.ink },
  fertig: { fontFamily: fonts.hanken600, fontSize: 14, color: colors.tealText },
  vermoegenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    backgroundColor: colors.dark,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  vermoegenLabel: { fontFamily: fonts.mono600, fontSize: 10, letterSpacing: 0.6, color: '#8f8b83' },
  vermoegenValue: { fontFamily: fonts.mono600, fontSize: 17, color: '#fff' },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  label: { ...type.monoLabel, color: colors.muted2 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 7 },
  stepper: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 11,
    paddingVertical: 9,
  },
  priceNum: { fontFamily: fonts.mono600, fontSize: 20, color: colors.ink },
  smallMono: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.muted, marginTop: 8 },

  sliderHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sliderLabel: { fontFamily: fonts.hanken500, fontSize: 13, color: colors.ink2 },
  sliderValue: { fontFamily: fonts.mono600, fontSize: 14, color: colors.ink },
  hintInline: { fontFamily: fonts.mono400, fontSize: 10, color: colors.faint },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoftAlt,
  },
  input: {
    textAlign: 'right',
    fontFamily: fonts.mono600,
    fontSize: 13,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  sumMono: { fontFamily: fonts.mono600, fontSize: 11, color: colors.ink2 },
  afaHint: { fontFamily: fonts.mono600, fontSize: 11, color: colors.tealText },

  presets: { flexDirection: 'row', gap: 6, marginTop: 8 },
  preset: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  presetActive: { borderColor: colors.ink, backgroundColor: colors.chipBg },
  presetLabel: { fontFamily: fonts.mono500, fontSize: 11, color: colors.muted2 },

  doneBtn: {
    marginTop: 22,
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.dark,
    borderRadius: radii.buttonLg,
  },
  doneBtnText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#fff' },
});
