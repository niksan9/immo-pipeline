/**
 * Ansprechpartner sheet — README "2a. Ansprechpartner" (tap → this sheet).
 * Anrufen · E-Mail · Foto hinzufügen · Anpassen. The actions themselves remain
 * stub toasts (no real phone / mail / picker), matching the prototype.
 */

import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { Contact } from '@dealpilot/core';
import { colors } from '../../theme/tokens';
import { fonts } from '../../theme/typography';
import { Sheet } from '../Sheet';
import { initials } from '../../lib/pipeline';

export interface ContactSheetProps {
  visible: boolean;
  onClose: () => void;
  contact: Contact;
  onToast: (msg: string) => void;
}

export function ContactSheet({ visible, onClose, contact, onToast }: ContactSheetProps) {
  const act = (msg: string) => {
    onClose();
    onToast(msg);
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="contact-sheet">
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(contact.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.role}>{contact.role}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => act(`Anruf an ${contact.name}`)}
          style={styles.row}
          accessibilityRole="button"
          testID="contact-call"
        >
          <Svg width={18} height={18} fill="none" stroke={colors.greenText} strokeWidth={1.7}>
            <Path d="M3 3.5c0 7 4 11 11 11l0-3-3-1.2-1.7 1.4C7.6 11 6.5 9.4 5.7 7.3L7 5.7 6 2.5z" />
          </Svg>
          <Text style={styles.rowText}>Anrufen</Text>
        </Pressable>

        <Pressable
          onPress={() => act(`E-Mail an ${contact.name}`)}
          style={styles.row}
          accessibilityRole="button"
          testID="contact-mail"
        >
          <Svg width={18} height={18} fill="none" stroke={colors.tealText} strokeWidth={1.7}>
            <Rect x={2} y={4} width={14} height={10} rx={1.5} />
            <Path d="M2.5 5l6.5 4.5L15.5 5" />
          </Svg>
          <Text style={styles.rowText}>E-Mail schreiben</Text>
        </Pressable>

        <Pressable
          onPress={() => act('Foto hinzugefügt')}
          style={styles.row}
          accessibilityRole="button"
          testID="contact-photo"
        >
          <Svg width={18} height={18} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
            <Rect x={2} y={5} width={14} height={10} rx={2} />
            <Circle cx={9} cy={10} r={2.6} />
            <Path d="M6 5l1.2-2h3.6L12 5" />
          </Svg>
          <Text style={styles.rowText}>Foto hinzufügen</Text>
        </Pressable>

        <Pressable
          onPress={() => act('Ansprechpartner anpassen – Demo')}
          style={styles.row}
          accessibilityRole="button"
          testID="contact-edit"
        >
          <Svg width={18} height={18} fill="none" stroke={colors.ink2} strokeWidth={1.7}>
            <Path d="M11 3l3 3-8.5 8.5L2 15l.5-3.5z" />
          </Svg>
          <Text style={styles.rowText}>Anpassen</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingBottom: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dfe6e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.hanken600, fontSize: 15, color: colors.teal },
  name: { fontFamily: fonts.bricolage700, fontSize: 16, color: colors.ink },
  role: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.muted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 14,
    marginTop: 8,
  },
  rowText: { fontFamily: fonts.hanken600, fontSize: 13.5, color: colors.ink },
});
