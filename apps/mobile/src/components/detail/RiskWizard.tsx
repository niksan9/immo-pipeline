/**
 * Risiko-Wizard (bottom Sheet, 2 steps) — README "Wizard (Sheet), 2 Stufen".
 *
 *  - choose : four routes — In Kosten übernehmen (covered = estimate) ·
 *    Akzeptieren, Kosten entfallen (accepted = 0 €) · Kontext geben (→ context) ·
 *    Fragen an Verkäufer (question = 0 €).
 *  - context: a scripted mini-chat. The user types free text → a faked
 *    "arbeitet…" delay → a scripted assistant reply (see lib/riskWizard.ts). A
 *    relieving message yields a proposal card ("Kosten entfallen"/"reduziert")
 *    whose "Risiko so anpassen" button applies it via core's applyContextProposal.
 *
 * The wizard never touches core directly — it calls the on* callbacks the parent
 * wires to the store (which delegates to core). No real AI, all client-side.
 */

import * as React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { formatNumber, type ContextProposal, type Risk } from '@dealpilot/core';
import { Sheet } from '../Sheet';
import { colors, radii } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { BackIcon, BubbleIcon, CheckIcon, ClockIcon, PlusThin, SendIcon } from '../icons';
import {
  CONTEXT_INTRO,
  proposalEffect,
  respondToContext,
  type WizardProposal,
} from '../../lib/riskWizard';
import { estimateStr } from '../../lib/detail';

const WORK_DELAY_MS = 900;

interface ChatMsg {
  role: 'ai' | 'user';
  text: string;
}

export interface RiskWizardProps {
  visible: boolean;
  risk: Risk;
  onClose: () => void;
  onCover: () => void;
  onAccept: () => void;
  onQuestion: () => void;
  onApplyProposal: (proposal: ContextProposal) => void;
}

export function RiskWizard({
  visible,
  risk,
  onClose,
  onCover,
  onAccept,
  onQuestion,
  onApplyProposal,
}: RiskWizardProps) {
  const [step, setStep] = React.useState<'choose' | 'context'>('choose');
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [input, setInput] = React.useState('');
  const [working, setWorking] = React.useState(false);
  const [proposal, setProposal] = React.useState<WizardProposal | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the choose step every time the sheet (re)opens.
  React.useEffect(() => {
    if (visible) {
      setStep('choose');
      setMessages([]);
      setInput('');
      setWorking(false);
      setProposal(null);
    }
  }, [visible]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const goContext = () => {
    setStep('context');
    setMessages([{ role: 'ai', text: CONTEXT_INTRO }]);
    setInput('');
    setProposal(null);
  };

  const send = () => {
    const text = input.trim();
    if (!text || working) return;
    const withUser: ChatMsg[] = [...messages, { role: 'user', text }];
    const userTurns = withUser.filter((m) => m.role === 'user').length;
    setMessages(withUser);
    setInput('');
    setWorking(true);
    setProposal(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const res = respondToContext({ text, userTurns, estimate: risk.estimate });
      setMessages((prev) => [...prev, { role: 'ai', text: res.reply }]);
      setWorking(false);
      setProposal(res.proposal);
    }, WORK_DELAY_MS);
  };

  const applyProposal = () => {
    if (!proposal) return;
    // Strip the display-only label before handing it to core.
    const { label: _label, ...core } = proposal;
    onApplyProposal(core);
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="risk-wizard">
      {step === 'choose' ? (
        <View testID="wizard-choose">
          <View style={styles.headerPad}>
            <Text style={styles.title}>Wie gehst du damit um?</Text>
            <Text style={styles.subtitle}>{risk.title}</Text>
          </View>
          <View style={styles.chooseBody}>
            <Option
              testID="wiz-cover"
              iconBg={colors.redSoft}
              icon={<PlusThin size={16} color={colors.red} />}
              title="In Kosten übernehmen"
              sub={`${estimateStr(risk)} fließen in die Kalkulation`}
              onPress={onCover}
            />
            <Option
              testID="wiz-accept"
              iconBg={colors.greenSoft}
              icon={<CheckIcon size={16} color={colors.greenText} />}
              title="Akzeptieren, Kosten entfallen"
              sub="bewusst hingenommen · 0 €"
              onPress={onAccept}
            />
            <Option
              testID="wiz-context"
              iconBg={colors.tealSoft}
              icon={<BubbleIcon size={16} color={colors.tealText} />}
              title="Kontext geben"
              badge="KI"
              sub="Gutachten, Absprachen, eigener Betrag …"
              onPress={goContext}
            />
            <Option
              testID="wiz-question"
              plain
              iconBg={colors.chipBgAlt}
              icon={<ClockIcon size={16} color={colors.muted} />}
              title="Fragen an Verkäufer"
              sub="bleibt offen · KI-Fragenkatalog"
              onPress={onQuestion}
            />
          </View>
        </View>
      ) : (
        <View testID="wizard-context">
          <View style={styles.ctxHeader}>
            <Pressable
              onPress={() => setStep('choose')}
              accessibilityRole="button"
              accessibilityLabel="Zurück"
              testID="wiz-ctx-back"
              style={styles.ctxBack}
            >
              <BackIcon size={18} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctxTitle}>Kontext geben</Text>
              <Text style={styles.ctxSub}>{risk.title}</Text>
            </View>
          </View>

          <ScrollView style={styles.ctxScroll} contentContainerStyle={styles.ctxScrollBody}>
            {messages.map((m, i) => (
              <View
                key={i}
                style={[styles.msgRow, m.role === 'ai' ? styles.msgRowAi : styles.msgRowUser]}
              >
                {m.role === 'ai' && (
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>KI</Text>
                  </View>
                )}
                <Text
                  style={[m.role === 'ai' ? styles.bubbleAi : styles.bubbleUser]}
                  testID={m.role === 'ai' ? `ctx-ai-${i}` : `ctx-user-${i}`}
                >
                  {m.text}
                </Text>
              </View>
            ))}

            {working && (
              <View style={[styles.msgRow, styles.msgRowAi]} testID="ctx-working">
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>KI</Text>
                </View>
                <Text style={[styles.bubbleAi, styles.working]}>arbeitet…</Text>
              </View>
            )}

            {proposal && (
              <View style={styles.proposalCard} testID="ctx-proposal">
                <View style={styles.proposalHead}>
                  <Text style={styles.proposalLabel}>Vorschlag: {proposal.label}</Text>
                  <Text style={styles.proposalEffect}>
                    {proposalEffect(proposal, formatNumber)}
                  </Text>
                </View>
                <Pressable
                  onPress={applyProposal}
                  accessibilityRole="button"
                  testID="ctx-apply"
                  style={styles.proposalBtn}
                >
                  <Text style={styles.proposalBtnText}>Risiko so anpassen</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              placeholder="Info hinzufügen …"
              placeholderTextColor={colors.faint}
              style={styles.input}
              testID="ctx-input"
              returnKeyType="send"
            />
            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel="Senden"
              testID="ctx-send"
              style={styles.sendBtn}
            >
              <SendIcon size={19} />
            </Pressable>
          </View>
        </View>
      )}
    </Sheet>
  );
}

function Option({
  testID,
  iconBg,
  icon,
  title,
  sub,
  badge,
  plain,
  onPress,
}: {
  testID: string;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  badge?: string;
  plain?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={[styles.option, plain && styles.optionPlain]}
    >
      <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge && <Text style={styles.optionBadge}>{badge}</Text>}
        </View>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 18,
    letterSpacing: -0.18,
    color: colors.ink,
  },
  subtitle: { fontFamily: fonts.hanken400, fontSize: 11.5, color: colors.muted, marginTop: 3 },
  chooseBody: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 26 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chipLg,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 9,
  },
  optionPlain: { backgroundColor: 'transparent', borderColor: 'transparent' },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  optionTitle: { fontFamily: fonts.hanken600, fontSize: 13.5, color: colors.ink },
  optionBadge: {
    fontFamily: fonts.mono500,
    fontSize: 9,
    color: colors.tealText,
    backgroundColor: colors.tealSoft,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  optionSub: { fontFamily: fonts.mono400, fontSize: 11, color: colors.muted2, marginTop: 1 },

  ctxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },
  ctxBack: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ctxTitle: { fontFamily: fonts.bricolage700, fontSize: 16, color: colors.ink },
  ctxSub: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.muted2, marginTop: 1 },

  ctxScroll: { maxHeight: 300 },
  ctxScrollBody: { paddingHorizontal: 18, paddingTop: 4 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 11 },
  msgRowAi: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { fontFamily: fonts.mono600, fontSize: 8, color: '#fff' },
  bubbleAi: {
    maxWidth: '82%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    borderTopLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.hanken400,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  bubbleUser: {
    maxWidth: '82%',
    backgroundColor: colors.dark,
    borderRadius: 13,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.hanken400,
    fontSize: 13,
    lineHeight: 19,
    color: '#f4f2ef',
  },
  working: { fontFamily: fonts.mono600, letterSpacing: 2, color: colors.faintAlt },

  proposalCard: {
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: '#cddce0',
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  proposalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proposalLabel: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.ink },
  proposalEffect: { fontFamily: fonts.mono600, fontSize: 13, color: colors.tealText },
  proposalBtn: {
    marginTop: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.teal,
    borderRadius: 11,
  },
  proposalBtnText: { fontFamily: fonts.hanken600, fontSize: 13, color: '#fff' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.chipBgAlt,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    color: colors.ink,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
