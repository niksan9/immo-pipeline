/**
 * Chat-Verlauf-Sheet — README "2d. → Chat-Verlauf-Sheet".
 *
 * Bottom sheet listing every chat of the deal (title, linked topic, message
 * count). The active thread is outlined (dark border); "Neuer Chat" starts a
 * fresh empty chat (token saving — its title is derived from the first question
 * later). Purely presentational: selection / creation are delegated up.
 */

import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Sheet } from '../Sheet';
import { colors, radii } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import type { ChatsState } from '../../data/chats';

export interface ChatHistorySheetProps {
  visible: boolean;
  chats: ChatsState;
  onClose: () => void;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatHistorySheet({
  visible,
  chats,
  onClose,
  onSelect,
  onNewChat,
}: ChatHistorySheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} testID="chat-history-sheet">
      <View style={styles.head}>
        <Text style={styles.title}>Chats · {chats.threads.length}</Text>
        <Pressable
          onPress={onNewChat}
          accessibilityRole="button"
          style={styles.newBtn}
          testID="chat-history-new"
        >
          <Svg width={12} height={12} fill="#fff">
            <Rect x={5} y={1.5} width={2} height={9} rx={1} />
            <Rect x={1.5} y={5} width={9} height={2} rx={1} />
          </Svg>
          <Text style={styles.newText}>Neuer Chat</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {chats.threads.map((c) => {
          const activeThread = c.id === chats.activeChatId;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeThread }}
              style={[styles.row, { borderColor: activeThread ? colors.ink : colors.line }]}
              testID={`chat-thread-${c.id}`}
            >
              <Svg width={17} height={17} fill="none" stroke={colors.teal} strokeWidth={1.6}>
                <Path d="M2 3h13v9H6l-3 3z" strokeLinejoin="round" />
              </Svg>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                {c.linked && (
                  <Text style={styles.rowLinked} numberOfLines={1}>
                    {c.linked.label}
                  </Text>
                )}
              </View>
              <Text style={styles.rowCount}>{c.msgs.length} Nachr.</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 17,
    letterSpacing: -0.17,
    color: colors.ink,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark,
    borderRadius: radii.chipSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newText: { fontFamily: fonts.hanken600, fontSize: 11.5, color: '#fff' },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.chipLg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.ink },
  rowLinked: { fontFamily: fonts.mono500, fontSize: 9.5, color: colors.tealText, marginTop: 2 },
  rowCount: { fontFamily: fonts.mono400, fontSize: 9.5, color: colors.faint },
});
