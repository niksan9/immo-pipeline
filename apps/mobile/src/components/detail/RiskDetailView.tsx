/**
 * Risiko-Detail (Lebenszyklus) — README "3. Risiko-Detail".
 *
 * Presentational body of the risk screen: status badge (+ lock when resolved),
 * title/description, the source-backed Fundstelle block (the "proof the AI isn't
 * hallucinating" element), the Effekt-Zeile, and the state-dependent actions:
 *   - open     → optional surveyor affiliate card + "Risiko jetzt bewerten" CTA
 *   - resolved → optional surveyor/context cards + "Aktualisieren" / "Neu eröffnen"
 *
 * Every mutation goes through the on* callbacks the route wires to the store
 * (which delegates to @dealpilot/core). The wizard sheet is owned here.
 */

import * as React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import type { ContextProposal, Risk } from '@dealpilot/core';
import { colors, radii, shadows } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import {
  riskEffect,
  riskStatusBadge,
  showSurveyorCTA,
} from '../../lib/detail';
import {
  ChevronRight,
  DocIcon,
  LockIcon,
  RefreshIcon,
  ReopenIcon,
  ShieldIcon,
} from '../icons';
import { PulseDot } from '../PulseDot';
import { RiskWizard } from './RiskWizard';

export interface RiskDetailViewProps {
  risk: Risk;
  onCover: () => void;
  onAccept: () => void;
  onQuestion: () => void;
  onReopen: () => void;
  onApplyProposal: (proposal: ContextProposal) => void;
  onSurveyor: () => void;
}

export function RiskDetailView({
  risk,
  onCover,
  onAccept,
  onQuestion,
  onReopen,
  onApplyProposal,
  onSurveyor,
}: RiskDetailViewProps) {
  const [wizardOpen, setWizardOpen] = React.useState(false);

  const badge = riskStatusBadge(risk.status);
  const effect = riskEffect(risk);
  const isOpen = risk.status === 'open';

  const closeAfter = (fn: () => void) => () => {
    fn();
    setWizardOpen(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        testID="risk-detail-scroll"
      >
        {/* Status badge + lock */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: badge.bgColor }]} testID="risk-badge">
            {badge.pulsing ? (
              <PulseDot size={7} color={badge.dotColor} />
            ) : (
              <View style={[styles.dot, { backgroundColor: badge.dotColor }]} />
            )}
            <Text style={[styles.badgeText, { color: badge.textColor }]}>{badge.text}</Text>
          </View>
          {badge.locked && <LockIcon size={15} color={colors.faintAlt} />}
        </View>

        {/* Title + description */}
        <Text style={styles.title} testID="risk-title">
          {risk.title}
        </Text>
        {!!risk.description && <Text style={styles.desc}>{risk.description}</Text>}

        {/* Fundstelle */}
        {!!risk.quote && (
          <>
            <Text style={styles.fundLabel}>FUNDSTELLE</Text>
            <View
              style={[styles.fundCard, { borderLeftColor: badge.dotColor }]}
              testID="risk-fundstelle"
            >
              <Text style={styles.fundQuote}>{risk.quote}</Text>
              {!!risk.source && (
                <View style={styles.fundSourceRow}>
                  <DocIcon size={12} color={colors.muted2} />
                  <Text style={styles.fundSource}>{risk.source}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Effekt-Zeile */}
        <View
          style={[styles.effectRow, effect.dashed ? styles.effectDashed : styles.effectSolid]}
          testID="risk-effect"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.effectLabel}>{effect.label}</Text>
            {!!effect.sub && <Text style={styles.effectSub}>{effect.sub}</Text>}
          </View>
          <Text style={[styles.effectAmount, { color: effect.amountColor }]}>
            {effect.amountStr}
          </Text>
        </View>

        {isOpen ? (
          <>
            {showSurveyorCTA(risk) && (
              <Pressable
                onPress={onSurveyor}
                accessibilityRole="button"
                testID="risk-surveyor-cta"
                style={styles.affiliateCard}
              >
                <View style={styles.affiliateIcon}>
                  <ShieldIcon size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.affiliateTitle}>Bausachverständigen dazuholen</Text>
                  <Text style={styles.affiliateSub}>Bei größeren Sachen · Kontakt stellen wir</Text>
                </View>
                <ChevronRight size={14} color={colors.tealText} />
              </Pressable>
            )}
            <Pressable
              onPress={() => setWizardOpen(true)}
              accessibilityRole="button"
              testID="risk-evaluate-cta"
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Risiko jetzt bewerten</Text>
            </Pressable>
            <Text style={styles.primaryHint}>übernehmen · akzeptieren · Kontext geben</Text>
          </>
        ) : (
          <>
            {!!risk.surveyor && (
              <View style={styles.surveyorCard} testID="risk-surveyor-card">
                <View style={styles.surveyorIcon}>
                  <ShieldIcon size={15} color={colors.tealText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.surveyorName}>{risk.surveyor}</Text>
                  <Text style={styles.surveyorMeta}>Anfrage über DealPilot</Text>
                </View>
              </View>
            )}
            {!!risk.context && (
              <View style={styles.contextCard} testID="risk-context-card">
                <Text style={styles.contextText}>{risk.context}</Text>
                <View style={styles.contextFooter}>
                  <View style={styles.contextDot} />
                  <Text style={styles.contextFooterText}>Eigener Kontext</Text>
                </View>
              </View>
            )}
            <View style={styles.doneBtnRow}>
              <Pressable
                onPress={() => setWizardOpen(true)}
                accessibilityRole="button"
                testID="risk-update-btn"
                style={styles.doneBtn}
              >
                <RefreshIcon size={14} color={colors.tealText} />
                <Text style={[styles.doneBtnText, { color: colors.tealText }]}>Aktualisieren</Text>
              </Pressable>
              <Pressable
                onPress={onReopen}
                accessibilityRole="button"
                testID="risk-reopen-btn"
                style={styles.doneBtn}
              >
                <ReopenIcon size={14} color={colors.ink2} />
                <Text style={[styles.doneBtnText, { color: colors.ink2 }]}>Neu eröffnen</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <RiskWizard
        visible={wizardOpen}
        risk={risk}
        onClose={() => setWizardOpen(false)}
        onCover={closeAfter(onCover)}
        onAccept={closeAfter(onAccept)}
        onQuestion={closeAfter(onQuestion)}
        onApplyProposal={(p) => {
          onApplyProposal(p);
          setWizardOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  badgeText: { fontFamily: fonts.mono600, fontSize: 10, letterSpacing: 0.6 },

  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.ink,
    marginTop: 12,
  },
  desc: {
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.ink2,
    marginTop: 8,
  },

  fundLabel: {
    fontFamily: fonts.mono600,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted2,
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  fundCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  fundQuote: {
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    lineHeight: 22,
    fontStyle: 'italic',
    color: colors.ink2,
  },
  fundSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  fundSource: { fontFamily: fonts.mono500, fontSize: 11, color: colors.muted },

  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  effectSolid: { borderWidth: 1, borderColor: colors.line },
  effectDashed: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#d8d5cf' },
  effectLabel: { fontFamily: fonts.hanken500, fontSize: 11.5, color: colors.muted },
  effectSub: { fontFamily: fonts.mono400, fontSize: 9.5, color: colors.faint, marginTop: 2 },
  effectAmount: { fontFamily: fonts.mono600, fontSize: 15 },

  affiliateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.tealSoft,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  affiliateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affiliateTitle: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.ink },
  affiliateSub: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.tealText, marginTop: 2 },

  primaryBtn: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: colors.dark,
    borderRadius: radii.buttonLg,
  },
  primaryBtnText: { fontFamily: fonts.hanken600, fontSize: 14, color: '#fff' },
  primaryHint: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    color: colors.faint,
    textAlign: 'center',
    marginTop: 9,
  },

  surveyorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 9,
    ...shadows.card,
  },
  surveyorIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyorName: { fontFamily: fonts.hanken600, fontSize: 11.5, color: colors.ink },
  surveyorMeta: { fontFamily: fonts.mono400, fontSize: 10, color: colors.muted2, marginTop: 1 },

  contextCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 9,
  },
  contextText: {
    fontFamily: fonts.hanken400,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    color: colors.ink2,
  },
  contextFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  contextDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.teal },
  contextFooterText: { fontFamily: fonts.mono400, fontSize: 10, color: colors.muted2 },

  doneBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#d8d5cf',
    borderRadius: radii.chipLg,
    paddingVertical: 13,
  },
  doneBtnText: { fontFamily: fonts.hanken600, fontSize: 12.5 },
});
