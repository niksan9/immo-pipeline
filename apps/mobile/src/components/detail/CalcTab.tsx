/**
 * Tab "Kalkulation": scenario switch, Cashflow-Hero, Kennzahl grid, Annahmen
 * short list (→ Annahmen-Sheet), Mietentwicklung (bars + per-year list, →
 * Maßnahme-Sheet) and Kaufnebenkosten. Every value is live from @dealpilot/core;
 * changing any assumption in the sheet recomputes the whole tab immediately.
 */

import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  calc,
  formatEUR,
  formatPercent,
  type DealState,
  type Measure,
  type Scenario,
} from '@dealpilot/core';
import { colors, radii, shadows } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import {
  assumptionsVM,
  heroVM,
  kaufnebenkosten,
  kennzahlVM,
  scheduleBars,
  scheduleRows,
  SCENARIO_LABEL,
} from '../../lib/detail';
import { Segmented } from '../Segmented';
import { Slider } from '../Slider';
import { ChevronRight, InfoIcon, PlusThin, SlidersIcon } from '../icons';
import { AnnahmenSheet } from './AnnahmenSheet';
import { MassnahmeSheet } from './MassnahmeSheet';
import type { AssumptionPatch } from '../../data/store';

export interface CalcActions {
  setScenario: (scenario: Scenario) => void;
  setScenarioPrice: (scenario: Scenario, price: number) => void;
  patchFinancing: (patch: Partial<DealState['financing']>) => void;
  patchCosts: (patch: Partial<DealState['costs']>) => void;
  patchAssumptions: (patch: AssumptionPatch) => void;
  addMeasure: (measure: Measure) => void;
}

export interface CalcTabProps {
  state: DealState;
  actions: CalcActions;
  onToast: (msg: string) => void;
}

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'base', label: 'Base' },
  { key: 'bull', label: 'Bull' },
  { key: 'bear', label: 'Bear' },
];

export function CalcTab({ state, actions, onToast }: CalcTabProps) {
  const c = calc(state);
  const hero = heroVM(c);
  const grid = kennzahlVM(c);
  const assumptions = assumptionsVM(state, c);
  const nk = kaufnebenkosten(state, c);
  const scenarioLabel = SCENARIO_LABEL[state.scenario];

  const [rentMode, setRentMode] = React.useState<'auto' | 'year'>('year');
  const [yearsExpanded, setYearsExpanded] = React.useState(false);
  const [annahmenOpen, setAnnahmenOpen] = React.useState(false);
  const [massnahmeOpen, setMassnahmeOpen] = React.useState(false);

  const bars = scheduleBars(state, c);
  const rows = scheduleRows(state, c, yearsExpanded);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        testID="calc-scroll"
      >
        <Segmented
          options={SCENARIOS}
          value={state.scenario}
          onChange={actions.setScenario}
          testIDPrefix="scenario"
        />

        {/* Cashflow-Hero */}
        <View style={styles.hero}>
          <View style={styles.rowBetween}>
            <Text style={styles.heroLabel}>CASHFLOW / MONAT · {scenarioLabel}</Text>
            <Pressable
              style={styles.infoBtn}
              onPress={() => onToast('Berechnungen – bald verfügbar')}
              accessibilityRole="button"
              accessibilityLabel="Berechnung anzeigen"
            >
              <InfoIcon />
            </Pressable>
          </View>
          <View style={styles.heroBigRow}>
            <Text style={[styles.heroBig, { color: hero.cfColor }]} testID="hero-cashflow">
              {hero.cfStr}
            </Text>
            <Text style={[styles.heroAfterTax, { color: hero.cfAfterTaxColor }]}>
              {hero.cfAfterTaxStr} n. Steuern
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Vermögenszuwachs</Text>
              <Text style={styles.heroStatValue} testID="hero-vermoegen">
                {hero.vermoegenStr}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Bruttomietrendite</Text>
              <Text style={styles.heroStatValue} testID="hero-brutto">
                {hero.bruttoStr}
              </Text>
            </View>
          </View>
        </View>

        {/* Kennzahl grid 2×2 */}
        <View style={styles.grid}>
          <KennzahlCard label="EK-RENDITE 10 J." value={grid.ekRendStr} testID="kz-ekrendite" />
          <KennzahlCard label="KAUFPREISFAKTOR" value={grid.faktorStr} testID="kz-faktor" />
          <KennzahlCard
            label="GIK · GESAMTINVEST."
            value={grid.gikStr}
            hint="KP + Nebenk. + Risiken"
            testID="kz-gik"
          />
          <KennzahlCard
            label="BANKRATE"
            value={grid.bankrateStr}
            hint="Zins + Tilgung"
            testID="kz-bankrate"
          />
        </View>

        {/* Annahmen short list */}
        <Pressable
          style={[styles.rowBetween, styles.assumptionsHead]}
          onPress={() => setAnnahmenOpen(true)}
        >
          <Text style={type.monoLabel}>ANNAHMEN · {scenarioLabel}</Text>
          <Text style={styles.anpassen}>Anpassen</Text>
        </Pressable>
        <Pressable
          style={styles.assumptionsCard}
          onPress={() => setAnnahmenOpen(true)}
          testID="assumptions-card"
        >
          <AssumptionRow label="Kaufpreis" value={assumptions.kaufpreisStr} />
          <AssumptionRow label="Sollzins" value={assumptions.zinsStr} />
          <AssumptionRow label="Anf. Tilgung" value={assumptions.tilgStr} />
          <AssumptionRow label="Eigenkapital" value={assumptions.ekStr} />
          <AssumptionRow
            label="Übernommene Risiken"
            value={assumptions.riskRowVal}
            valueColor={assumptions.riskRowColor}
            last
          />
        </Pressable>
        <Pressable
          style={styles.adjustBtn}
          onPress={() => setAnnahmenOpen(true)}
          accessibilityRole="button"
        >
          <SlidersIcon />
          <Text style={styles.adjustBtnText}>Annahmen anpassen</Text>
        </Pressable>

        {/* Mietentwicklung */}
        <View style={[styles.rowBetween, styles.mietHead]}>
          <Text style={type.monoLabel}>MIETENTWICKLUNG</Text>
          <Segmented
            size="sm"
            options={[
              { key: 'auto', label: 'Automatik' },
              { key: 'year', label: 'Pro Jahr' },
            ]}
            value={rentMode}
            onChange={setRentMode}
            testIDPrefix="rentmode"
          />
        </View>

        <View style={styles.barCard}>
          <View style={styles.barChart}>
            {bars.map((bar, i) => (
              <View
                key={i}
                testID={`schedule-bar-${i}`}
                style={{
                  flex: 1,
                  height: bar.height,
                  backgroundColor: bar.color,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            ))}
          </View>
          <View style={styles.barAxis}>
            {['J1', 'J3', 'J5', 'J8', 'J10'].map((l) => (
              <Text key={l} style={styles.barAxisLabel}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        {rentMode === 'auto' ? (
          <View style={styles.autoCard}>
            <View style={styles.rowBetweenBaseline}>
              <Text style={styles.autoLabel}>Mietsteigerung p. a.</Text>
              <Text style={styles.autoValue}>{formatPercent(state.steig)}</Text>
            </View>
            <Slider
              min={0}
              max={5}
              step={0.1}
              value={state.steig}
              onValueChange={(v) => actions.patchAssumptions({ steig: v })}
              color={colors.teal}
              testID="slider-steig"
            />
            <View style={styles.autoHint}>
              <View style={[styles.greenDot, { marginTop: 4 }]} />
              <Text style={styles.autoHintText}>
                KI-Basis: Angebotsmieten +2,3 %/Jahr. Mietpreisbremse aktiv,
                Kappungsgrenze 15 %/3 J.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.yearCard}>
              {rows.map((r) => (
                <View key={r.year} style={styles.yearRow}>
                  <View style={styles.rowBetween}>
                    <View style={styles.yearLabelRow}>
                      <Text style={styles.yearLabel}>Jahr {r.year}</Text>
                      {r.adjusted && <Text style={styles.adjustedChip}>ANGEPASST</Text>}
                    </View>
                    <Text style={r.adjusted ? styles.rentPillActive : styles.rentPill}>
                      {r.rentStr}
                    </Text>
                  </View>
                  <View style={styles.yearCfRow}>
                    <Text style={styles.yearCfLabel}>Cashflow</Text>
                    <Text style={[styles.yearCfValue, { color: r.cfColor }]}>{r.cfStr}</Text>
                  </View>
                  {r.measure && (
                    <View style={styles.measureRow}>
                      <View style={styles.measureBadge}>
                        <Text style={styles.measureBadgeText}>M</Text>
                      </View>
                      <Text style={styles.measureText} numberOfLines={1}>
                        {r.measure.title} · {r.measure.upliftStr}
                      </Text>
                      <Text style={styles.measureInvest}>{r.measure.investStr}</Text>
                    </View>
                  )}
                </View>
              ))}
              <Pressable
                style={styles.moreBtn}
                onPress={() => setYearsExpanded((v) => !v)}
                accessibilityRole="button"
                testID="toggle-years"
              >
                <Text style={styles.moreText}>
                  {yearsExpanded ? 'Weniger anzeigen ▴' : 'Jahr 5–10 einblenden ▾'}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.addMeasureBtn}
              onPress={() => setMassnahmeOpen(true)}
              accessibilityRole="button"
              testID="add-measure-btn"
            >
              <PlusThin />
              <Text style={styles.addMeasureText}>Maßnahme hinzufügen</Text>
            </Pressable>
          </>
        )}

        {/* Kaufnebenkosten */}
        <Text style={[type.monoLabel, styles.nkHead]}>KAUFNEBENKOSTEN · AUTOMATISCH</Text>
        <View style={styles.nkCard}>
          {nk.map((line) => (
            <View
              key={line.label}
              style={line.danger ? styles.nkDanger : styles.nkRow}
            >
              <Text style={styles.nkLabel}>
                {line.label}
                {line.hint ? (
                  <Text style={[styles.nkHint, line.danger && { color: colors.red }]}>
                    {'  '}
                    {line.hint}
                  </Text>
                ) : null}
              </Text>
              <Text style={[styles.nkValue, { color: line.valueColor }]}>{line.valueStr}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      <AnnahmenSheet
        visible={annahmenOpen}
        onClose={() => setAnnahmenOpen(false)}
        state={state}
        actions={actions}
        onToast={onToast}
      />
      <MassnahmeSheet
        visible={massnahmeOpen}
        onClose={() => setMassnahmeOpen(false)}
        onAdd={(m) => {
          actions.addMeasure(m);
          setMassnahmeOpen(false);
          onToast('Maßnahme übernommen');
        }}
      />
    </>
  );
}

function KennzahlCard({
  label,
  value,
  hint,
  testID,
}: {
  label: string;
  value: string;
  hint?: string;
  testID?: string;
}) {
  return (
    <View style={styles.kzCard} testID={testID}>
      <Text style={styles.kzLabel}>{label}</Text>
      <Text style={styles.kzValue}>{value}</Text>
      {hint ? <Text style={styles.kzHint}>{hint}</Text> : null}
    </View>
  );
}

function AssumptionRow({
  label,
  value,
  valueColor = colors.ink,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.assumptionRow, !last && styles.assumptionDivider]}>
      <Text style={styles.assumptionLabel}>{label}</Text>
      <View style={styles.assumptionValueWrap}>
        <Text style={[styles.assumptionValue, { color: valueColor }]}>{value}</Text>
        <ChevronRight />
      </View>
    </View>
  );
}

const CARD = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.line,
} as const;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBetweenBaseline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  hero: { backgroundColor: colors.dark, borderRadius: radii.card, padding: 16, marginTop: 14 },
  heroLabel: { fontFamily: fonts.mono600, fontSize: 10.5, letterSpacing: 0.8, color: '#8f8b83' },
  infoBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#2a2925',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 11, marginTop: 6 },
  heroBig: { fontFamily: fonts.mono600, fontSize: 32, letterSpacing: -0.3 },
  heroAfterTax: { fontFamily: fonts.mono500, fontSize: 11 },
  heroDivider: { height: 1, backgroundColor: colors.darkLine, marginTop: 14 },
  heroStats: { flexDirection: 'row', gap: 16, marginTop: 13 },
  heroStat: { flex: 1, minWidth: 0 },
  heroStatDivider: { width: 1, backgroundColor: colors.darkLine },
  heroStatLabel: {
    fontFamily: fonts.mono600,
    fontSize: 8.5,
    letterSpacing: 0.5,
    color: '#8f8b83',
    textTransform: 'uppercase',
  },
  heroStatValue: { fontFamily: fonts.mono600, fontSize: 16, color: colors.tealLight, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  kzCard: {
    ...CARD,
    borderRadius: radii.cardSm,
    padding: 13,
    width: '48%',
    flexGrow: 1,
  },
  kzLabel: { fontFamily: fonts.mono600, fontSize: 9.5, letterSpacing: 0.7, color: colors.muted2 },
  kzValue: { fontFamily: fonts.mono600, fontSize: 20, color: colors.ink, marginTop: 5 },
  kzHint: { fontFamily: fonts.mono400, fontSize: 9, color: colors.faint, marginTop: 2 },

  assumptionsHead: { marginTop: 20, marginBottom: 8, marginHorizontal: 2 },
  anpassen: { fontFamily: fonts.hanken600, fontSize: 11, color: colors.tealText },
  assumptionsCard: { ...CARD, borderRadius: radii.cardSm, paddingHorizontal: 15 },
  assumptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  assumptionDivider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  assumptionLabel: { fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.ink2 },
  assumptionValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assumptionValue: { fontFamily: fonts.mono600, fontSize: 13 },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 13,
    backgroundColor: colors.dark,
    borderRadius: 13,
  },
  adjustBtnText: { fontFamily: fonts.hanken600, fontSize: 13, color: '#fff' },

  mietHead: { marginTop: 20 },
  barCard: { ...CARD, borderRadius: radii.card, padding: 16, marginTop: 10 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 64 },
  barAxis: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  barAxisLabel: { fontFamily: fonts.mono500, fontSize: 9, color: colors.faintAlt },

  autoCard: { ...CARD, borderRadius: radii.card, padding: 16, marginTop: 10 },
  autoLabel: { fontFamily: fonts.hanken500, fontSize: 13, color: colors.ink2 },
  autoValue: { fontFamily: fonts.mono600, fontSize: 14, color: colors.ink },
  autoHint: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.chipBg,
    borderRadius: 10,
    padding: 11,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  autoHintText: { flex: 1, fontFamily: fonts.mono400, fontSize: 11, lineHeight: 16, color: colors.muted },

  yearCard: { ...CARD, borderRadius: radii.card, paddingHorizontal: 15, marginTop: 10 },
  yearRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  yearLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  yearLabel: { fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.ink2 },
  adjustedChip: {
    fontFamily: fonts.mono600,
    fontSize: 8.5,
    color: colors.yellow,
    backgroundColor: colors.yellowSoft,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  rentPill: {
    fontFamily: fonts.mono600,
    fontSize: 13,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  rentPillActive: {
    fontFamily: fonts.mono600,
    fontSize: 13,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  yearCfRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', marginTop: 6, gap: 6 },
  yearCfLabel: { fontFamily: fonts.mono500, fontSize: 10.5, color: colors.muted2 },
  yearCfValue: { fontFamily: fonts.mono600, fontSize: 12 },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
    backgroundColor: colors.tealSoft,
    borderRadius: 9,
    padding: 8,
  },
  measureBadge: {
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  measureBadgeText: { fontFamily: fonts.mono600, fontSize: 9, color: '#fff' },
  measureText: { flex: 1, fontFamily: fonts.hanken500, fontSize: 11.5, color: colors.tealText },
  measureInvest: { fontFamily: fonts.mono600, fontSize: 11, color: colors.tealText },
  moreBtn: { alignItems: 'center', paddingVertical: 12 },
  moreText: { fontFamily: fonts.mono500, fontSize: 11.5, color: colors.faint },
  addMeasureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    padding: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#b6cdc4',
    borderRadius: radii.cardSm,
    backgroundColor: colors.surface,
  },
  addMeasureText: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.tealText },

  nkHead: { marginTop: 20 },
  nkCard: { ...CARD, borderRadius: radii.card, paddingHorizontal: 16, paddingBottom: 10, marginTop: 10 },
  nkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  nkDanger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 6,
    backgroundColor: colors.redSoft,
    borderRadius: 10,
  },
  nkLabel: { fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.ink2 },
  nkHint: { fontFamily: fonts.mono500, fontSize: 10.5, color: colors.faint },
  nkValue: { fontFamily: fonts.mono600, fontSize: 13 },
});
