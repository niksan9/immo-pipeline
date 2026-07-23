/**
 * Tab "Chat" — README "2d. Tab Chat (Multi-Chat)".
 *
 * Layout (all inside the deal-detail body, below the fixed header):
 *   - Chat header bar: current chat title + linked-topic chip (tappable →
 *     risk / Kalkulation / document), history icon (→ Chat-Verlauf sheet), "Neu".
 *   - Message list: AI bubbles (white + `KI` avatar) each with a MANDATORY source
 *     chip below when the message cites a source; user bubbles dark right-aligned.
 *     A "•••" typing indicator shows during the scripted reply delay.
 *   - Suggestion chips over the pinned, keyboard-safe input + dark round send.
 *
 * All scripted-reply logic + source classification live in src/lib/chat.ts; this
 * component only orchestrates the typing delay (fake-timer controllable) and the
 * store mutations. NO real AI calls.
 */

import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, radii } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { CHAT_SUGGESTIONS, type ChatLink, type ChatsState } from '../../data/chats';
import type { DealDocument, DocsState } from '../../data/documents';
import { classifySource, replyFor } from '../../lib/chat';
import { ChevronRight, SendIcon } from '../icons';
import { DocViewer } from './DocViewer';
import { ChatHistorySheet } from './ChatHistorySheet';

/** Scripted AI typing delay before the reply appears (~900ms per spec). */
export const TYPING_MS = 900;

export interface ChatActions {
  sendChatMessage: (text: string) => void;
  addAiReply: (chatId: string, reply: ReturnType<typeof replyFor>) => void;
  newChat: () => void;
  setActiveChat: (chatId: string) => void;
}

export interface ChatTabProps {
  chats: ChatsState;
  /** Document slice — used to resolve document source chips into the viewer. */
  docs: DocsState | undefined;
  actions: ChatActions;
  /** Navigate to a risk (linked-topic chip of kind "risk"). */
  onOpenRisk: (riskId: string) => void;
  /** Switch to another deal-detail tab (calc source / linked chip). */
  onSwitchTab: (tab: 'calc') => void;
  onToast: (msg: string) => void;
}

export function ChatTab({
  chats,
  docs,
  actions,
  onOpenRisk,
  onSwitchTab,
  onToast,
}: ChatTabProps) {
  const [typing, setTyping] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [viewerDoc, setViewerDoc] = React.useState<DealDocument | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const replyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    },
    [],
  );

  const send = React.useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || typing) return;
      // Capture the active chat now so the delayed reply lands in the right thread
      // even if the user switches chats meanwhile.
      const chatId = chats.activeChatId;
      actions.sendChatMessage(t);
      setInput('');
      setTyping(true);
      if (replyTimer.current) clearTimeout(replyTimer.current);
      replyTimer.current = setTimeout(() => {
        actions.addAiReply(chatId, replyFor(t));
        setTyping(false);
      }, TYPING_MS);
    },
    [actions, chats.activeChatId, typing],
  );

  const onSourcePress = React.useCallback(
    (source: string) => {
      const target = classifySource(source, docs);
      if (target.kind === 'document') setViewerDoc(target.doc);
      else if (target.kind === 'calc') onSwitchTab('calc');
      else onToast('Keine Quelle hinterlegt');
    },
    [docs, onSwitchTab, onToast],
  );

  const onLinkedPress = React.useCallback(
    (link: ChatLink) => {
      if (link.kind === 'risk' && link.target) onOpenRisk(link.target);
      else if (link.kind === 'calc') onSwitchTab('calc');
      else if (link.kind === 'document' && link.target) {
        const doc = docs?.present.find((d) => d.id === link.target);
        if (doc) setViewerDoc(doc);
        else onToast('Dokument nicht gefunden');
      }
    },
    [docs, onOpenRisk, onSwitchTab, onToast],
  );

  const active =
    chats.threads.find((t) => t.id === chats.activeChatId) ?? chats.threads[0];
  if (!active) return <View style={styles.root} testID="chat-tab" />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="chat-tab"
    >
      {/* Chat header bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => setHistoryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Chat-Verlauf"
          style={styles.headerLeft}
          testID="chat-history-open"
        >
          <Svg width={16} height={16} fill="none" stroke={colors.muted} strokeWidth={1.7}>
            <Path d="M2 4h12M2 8h12M2 12h7" strokeLinecap="round" />
          </Svg>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1} testID="chat-title">
              {active.title}
            </Text>
          </View>
          <Svg width={12} height={12} fill="none" stroke={colors.faintAlt} strokeWidth={2}>
            <Path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>

        {active.linked && (
          <Pressable
            onPress={() => onLinkedPress(active.linked as ChatLink)}
            accessibilityRole="button"
            style={styles.linkedChip}
            testID="chat-linked-chip"
          >
            <Text style={styles.linkedChipText} numberOfLines={1}>
              {active.linked.label}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={actions.newChat}
          accessibilityRole="button"
          style={styles.neuBtn}
          testID="chat-neu"
        >
          <Svg width={13} height={13} fill={colors.ink2}>
            <Rect x={5.5} y={1.5} width={2} height={10} rx={1} />
            <Rect x={1.5} y={5.5} width={10} height={2} rx={1} />
          </Svg>
          <Text style={styles.neuText}>Neu</Text>
        </Pressable>
      </View>

      {/* Message list */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        testID="chat-scroll"
      >
        {active.msgs.map((m, i) => {
          const isAi = m.role === 'ai';
          return (
            <View
              key={`${active.id}-${i}`}
              style={[styles.msgRow, isAi ? styles.msgRowAi : styles.msgRowUser]}
              testID={`chat-msg-${i}`}
            >
              {isAi && (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>KI</Text>
                </View>
              )}
              <View style={styles.bubbleWrap}>
                <View style={[styles.bubble, isAi ? styles.bubbleAi : styles.bubbleUser]}>
                  <Text style={isAi ? styles.bubbleTextAi : styles.bubbleTextUser}>
                    {m.text}
                  </Text>
                </View>
                {isAi && !!m.source && (
                  <Pressable
                    onPress={() => onSourcePress(m.source)}
                    accessibilityRole="button"
                    style={styles.sourceChip}
                    testID={`chat-source-${i}`}
                  >
                    <Svg width={11} height={11} fill="none" stroke={colors.muted2} strokeWidth={1.6}>
                      <Rect x={2} y={2} width={7} height={7} rx={1} />
                    </Svg>
                    <Text style={styles.sourceText}>{m.source}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {typing && (
          <View style={[styles.msgRow, styles.msgRowAi]} testID="chat-typing">
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>KI</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
              <Text style={styles.typingDots}>•••</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggestion chips + input */}
      <View style={styles.inputArea}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}
        >
          {CHAT_SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => send(s)}
              accessibilityRole="button"
              style={styles.suggestionChip}
              testID={`chat-suggestion-${s}`}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            placeholder="Frage zum Deal …"
            placeholderTextColor={colors.faint}
            style={styles.textInput}
            testID="chat-input"
          />
          <Pressable
            onPress={() => send(input)}
            accessibilityRole="button"
            accessibilityLabel="Senden"
            style={styles.sendBtn}
            testID="chat-send"
          >
            <SendIcon size={19} />
          </Pressable>
        </View>
      </View>

      <ChatHistorySheet
        visible={historyOpen}
        chats={chats}
        onClose={() => setHistoryOpen(false)}
        onSelect={(chatId) => {
          actions.setActiveChat(chatId);
          setHistoryOpen(false);
        }}
        onNewChat={() => {
          actions.newChat();
          setHistoryOpen(false);
        }}
      />

      <DocViewer
        doc={viewerDoc}
        onClose={() => setViewerDoc(null)}
        onAsk={() => {
          // Already inside a chat — just close the viewer.
          setViewerDoc(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const AVATAR = 26;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.ink },
  linkedChip: {
    maxWidth: 150,
    backgroundColor: colors.tealSoft,
    borderRadius: radii.chipSm,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  linkedChipText: { fontFamily: fonts.mono500, fontSize: 9.5, color: colors.tealText },
  neuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.chipBg,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  neuText: { fontFamily: fonts.hanken600, fontSize: 11.5, color: colors.ink2 },

  // Messages
  scroll: { flex: 1 },
  messages: { paddingHorizontal: 16, paddingVertical: 18, gap: 16 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start' },
  msgRowAi: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  avatarText: { fontFamily: fonts.mono600, fontSize: 9, color: '#fff' },
  bubbleWrap: { maxWidth: '82%' },
  bubble: { paddingVertical: 12, paddingHorizontal: 13 },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.dark,
    borderRadius: 14,
    borderBottomRightRadius: 4,
  },
  bubbleTextAi: { fontFamily: fonts.hanken400, fontSize: 13.5, lineHeight: 21, color: colors.ink },
  bubbleTextUser: { fontFamily: fonts.hanken400, fontSize: 13.5, lineHeight: 20, color: '#f4f2ef' },
  sourceChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceText: { fontFamily: fonts.mono500, fontSize: 10.5, color: colors.muted },
  typingBubble: { borderTopLeftRadius: 4 },
  typingDots: { fontFamily: fonts.mono600, fontSize: 14, letterSpacing: 2, color: colors.faintAlt },

  // Input area
  inputArea: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 11,
    paddingBottom: 12,
  },
  suggestions: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingBottom: 11 },
  suggestionChip: {
    backgroundColor: colors.chipBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionText: { fontFamily: fonts.hanken500, fontSize: 12, color: colors.ink2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  textInput: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
