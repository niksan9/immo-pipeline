/**
 * Tab "Übersicht": collaboration bar, KI-Urteil, Ansprechpartner, Score-
 * Zerlegung, grouped Risiken, and the Nächste-Schritte checklist. Every number
 * (max price, doku bar, risk amounts) is derived live from @dealpilot/core.
 */

import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  computeScore,
  formatEUR,
  type AmpelColor,
  type DealState,
} from '@dealpilot/core';
import { colors, radii, shadows } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import type { ScoreBreakdown } from '../../data/deals';
import { initials } from '../../lib/pipeline';
import { riskGroups, scoreBars, type RiskRowVM } from '../../lib/detail';
import { ChevronRight, MailIcon, PhoneIcon } from '../icons';

export interface OverviewTabProps {
  state: DealState;
  verdict: string;
  breakdown: ScoreBreakdown;
  score: number | null;
  color: AmpelColor | null;
  onToast: (msg: string) => void;
  /** Open the Risiko-Detail screen for a risk id. */
  onRiskPress: (riskId: string) => void;
  /** Open the Ansprechpartner sheet (contact card tap). */
  onOpenContact: () => void;
  /** Open the Zusammenarbeiten sheet (collaboration bar "Verwalten"). */
  onManageCollab: () => void;
}

interface Step {
  key: string;
  label: string;
  kiMail?: boolean;
}

const STEPS: Step[] = [
  { key: 'beschluss', label: 'Beschluss-Sammlung anfordern', kiMail: true },
  { key: 'grundbuch', label: 'Grundbuchauszug prüfen' },
  { key: 'besichtigung', label: 'Besichtigung terminieren' },
];

export function OverviewTab({
  state,
  verdict,
  breakdown,
  score,
  color,
  onToast,
  onRiskPress,
  onOpenContact,
  onManageCollab,
}: OverviewTabProps) {
  const { maxPreis } = computeScore(state.risks);
  const bars = scoreBars(state.risks, breakdown);
  const groups = riskGroups(state.risks);
  const contact = state.contact;
  const shared = state.collaborators.filter((c) => c.role !== 'owner');
  const scoreColorHex =
    color === 'green' ? colors.green : color === 'yellow' ? colors.yellow : colors.red;

  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const toggleStep = (step: Step) => {
    setChecked((prev) => {
      const next = { ...prev, [step.key]: !prev[step.key] };
      return next;
    });
    if (step.kiMail && !checked[step.key]) {
      onToast('KI-Mail an Verwalter erstellt · Beschluss-Sammlung');
    }
  };

  const shareLabel =
    shared.length === 0
      ? 'Nur du'
      : shared.length === 1
        ? `Geteilt mit ${shared[0]!.name.split(' ')[0]}`
        : `Geteilt mit ${shared[0]!.name.split(' ')[0]} +${shared.length - 1}`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      testID="overview-scroll"
    >
      {shared.length > 0 && (
        <Pressable
          style={styles.collab}
          onPress={onManageCollab}
          accessibilityRole="button"
          testID="collab-bar"
        >
          <View style={styles.avatarRow}>
            {[state.collaborators[0], ...shared].slice(0, 3).map((c, i) => (
              <View
                key={c!.id}
                style={[styles.miniAvatar, i > 0 && { marginLeft: -8 }]}
              >
                <Text style={styles.miniAvatarText}>
                  {initials(c!.name.replace(/\(.*\)/, '').trim())}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.collabLabel}>{shareLabel}</Text>
          <Text style={styles.verwalten}>Verwalten</Text>
        </Pressable>
      )}

      {/* KI-Urteil */}
      <View style={styles.kiCard}>
        <View style={styles.kiHead}>
          <View style={styles.greenDot} />
          <Text style={styles.kiLabel}>KI-URTEIL</Text>
        </View>
        <Text style={styles.kiText}>{verdict}</Text>
        <View style={styles.kiDivider} />
        <View style={styles.kiFooter}>
          <Text style={styles.kiMaxLabel}>EMPF. MAX-PREIS</Text>
          <Text style={styles.kiMaxChip}>{formatEUR(maxPreis)}</Text>
        </View>
      </View>

      {/* Ansprechpartner */}
      <Text style={[type.monoLabel, styles.sectionLabel]}>ANSPRECHPARTNER</Text>
      <Pressable
        style={styles.contactCard}
        onPress={onOpenContact}
        accessibilityRole="button"
        testID="contact-card"
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactInitials}>{initials(contact.name)}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactRole}>{contact.role}</Text>
        </View>
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.quick, { backgroundColor: colors.greenSoft }]}
            onPress={() => onToast(`Anruf an ${contact.name}`)}
            accessibilityRole="button"
            accessibilityLabel="Anrufen"
          >
            <PhoneIcon />
          </Pressable>
          <Pressable
            style={[styles.quick, { backgroundColor: colors.tealSoft }]}
            onPress={() => onToast(`E-Mail an ${contact.name}`)}
            accessibilityRole="button"
            accessibilityLabel="E-Mail"
          >
            <MailIcon />
          </Pressable>
        </View>
      </Pressable>

      {/* Score-Zerlegung */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={type.monoLabel}>SCORE-ZERLEGUNG</Text>
          <Text style={[styles.avgScore, { color: scoreColorHex }]}>
            Ø {score == null ? '—' : score}
          </Text>
        </View>
        {bars.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, bar.value)}%`, backgroundColor: bar.color },
                ]}
              />
            </View>
            <Text style={[styles.barValue, { color: bar.color }]}>{bar.value}</Text>
          </View>
        ))}
      </View>

      {/* Risiken */}
      <View style={[styles.rowBetween, styles.riskHead]}>
        <Text style={type.monoLabel}>RISIKEN</Text>
        <Text style={styles.riskCost}>einkalkuliert {groups.riskCostStr}</Text>
      </View>
      <View style={styles.riskCard}>
        {groups.hasOpen && (
          <>
            <View style={styles.groupHead}>
              <View style={styles.openDot} />
              <Text style={styles.groupLabel}>
                OFFEN · SCHWEBEND · {groups.openCount}
              </Text>
            </View>
            {groups.open.map((r) => (
              <RiskRow key={r.id} row={r} onTap={() => onRiskPress(r.id)} />
            ))}
          </>
        )}
        {groups.hasDone && (
          <>
            <View style={[styles.groupHead, { paddingTop: 16 }]}>
              <Text style={[styles.groupLabel, { color: colors.muted2 }]}>
                ERLEDIGT · {groups.doneCount}
              </Text>
            </View>
            {groups.done.map((r) => (
              <RiskRow key={r.id} row={r} dim onTap={() => onRiskPress(r.id)} />
            ))}
          </>
        )}
      </View>

      {/* Nächste Schritte */}
      <View style={styles.stepsCard}>
        <Text style={[type.monoLabel, styles.stepsLabel]}>NÄCHSTE SCHRITTE</Text>
        {STEPS.map((step, i) => (
          <Pressable
            key={step.key}
            style={[styles.stepRow, i > 0 && styles.stepDivider]}
            onPress={() => toggleStep(step)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!checked[step.key] }}
            testID={`step-${step.key}`}
          >
            <View style={[styles.checkbox, checked[step.key] && styles.checkboxOn]}>
              {checked[step.key] && <View style={styles.checkboxDot} />}
            </View>
            <Text style={styles.stepLabel}>{step.label}</Text>
            {step.kiMail && <Text style={styles.kiMailChip}>KI-MAIL</Text>}
          </Pressable>
        ))}
      </View>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

function RiskRow({
  row,
  dim,
  onTap,
}: {
  row: RiskRowVM;
  dim?: boolean;
  onTap: () => void;
}) {
  return (
    <Pressable
      style={[styles.riskRow, dim && { opacity: 0.78 }]}
      onPress={onTap}
      accessibilityRole="button"
      testID={`risk-row-${row.id}`}
    >
      <Text style={[styles.riskTag, { color: row.tagColor }]}>{row.tag}</Text>
      <Text style={styles.riskTitle} numberOfLines={1}>
        {row.title}
      </Text>
      <Text style={[styles.riskAmount, { color: row.amountColor }]}>{row.amount}</Text>
      <ChevronRight size={12} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },

  collab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  avatarRow: { flexDirection: 'row' },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#dfe6e8',
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { fontFamily: fonts.hanken600, fontSize: 9.5, color: colors.teal },
  collabLabel: { flex: 1, fontFamily: fonts.hanken500, fontSize: 12, color: colors.ink2 },
  verwalten: { fontFamily: fonts.hanken600, fontSize: 11, color: colors.tealText },

  kiCard: { backgroundColor: colors.dark, borderRadius: radii.card, padding: 16 },
  kiHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  kiLabel: {
    fontFamily: fonts.mono600,
    fontSize: 10.5,
    letterSpacing: 1.3,
    color: '#8f8b83',
  },
  kiText: { fontFamily: fonts.hanken500, fontSize: 15, lineHeight: 23, color: '#f4f2ef' },
  kiDivider: { height: 1, backgroundColor: colors.darkLine, marginTop: 15 },
  kiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  kiMaxLabel: {
    fontFamily: fonts.mono600,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: '#8f8b83',
  },
  kiMaxChip: {
    fontFamily: fonts.mono600,
    fontSize: 15,
    color: '#fff',
    backgroundColor: colors.green,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },

  sectionLabel: { marginTop: 18, marginBottom: 8, marginHorizontal: 2 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 12,
    ...shadows.card,
  },
  contactAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#dfe6e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitials: { fontFamily: fonts.hanken600, fontSize: 15, color: colors.teal },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { fontFamily: fonts.hanken600, fontSize: 14, color: colors.ink },
  contactRole: { fontFamily: fonts.mono400, fontSize: 11, color: colors.muted, marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 8 },
  quick: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 16,
    marginTop: 16,
    ...shadows.card,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avgScore: { fontFamily: fonts.mono600, fontSize: 13 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  barLabel: { width: 96, fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.ink2 },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#efece7',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { width: 26, textAlign: 'right', fontFamily: fonts.mono600, fontSize: 13 },

  riskHead: { marginTop: 20, marginBottom: 8, marginHorizontal: 2 },
  riskCost: { fontFamily: fonts.mono600, fontSize: 11, color: colors.ink },
  riskCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.cardSm,
    paddingHorizontal: 15,
    paddingBottom: 8,
    ...shadows.card,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 13, paddingBottom: 5 },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.red,
    shadowColor: colors.redSoft,
  },
  groupLabel: { fontFamily: fonts.mono600, fontSize: 10, letterSpacing: 0.8, color: colors.muted },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  riskTag: { width: 34, fontFamily: fonts.mono600, fontSize: 8, letterSpacing: 0.3 },
  riskTitle: { flex: 1, minWidth: 0, fontFamily: fonts.hanken500, fontSize: 12.5, color: colors.ink },
  riskAmount: { fontFamily: fonts.mono500, fontSize: 11 },

  stepsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginTop: 16,
    ...shadows.card,
  },
  stepsLabel: { paddingTop: 12, paddingBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  stepDivider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: colors.grayInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: colors.green, backgroundColor: colors.green },
  checkboxDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: '#fff' },
  stepLabel: { flex: 1, fontFamily: fonts.hanken500, fontSize: 13, color: colors.ink2 },
  kiMailChip: {
    fontFamily: fonts.mono600,
    fontSize: 10.5,
    color: colors.greenText,
    backgroundColor: colors.greenSoft,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
