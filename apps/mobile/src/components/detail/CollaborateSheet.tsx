/**
 * Zusammenarbeiten sheet — README "7. Zusammenarbeiten".
 * Invite by email + role (Bearbeiten / Nur ansehen), "Einladungslink kopieren"
 * (stub toast) and the "Mit Zugriff" list (avatar, role, invited state, remove).
 * Store-backed: collaborators live on the deal, so adds/removes reflect in the
 * Übersicht collaboration bar and the pipeline row avatars. Purely simulated —
 * no real invites are sent.
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
import Svg, { Path } from 'react-native-svg';
import type { Collaborator } from '@dealpilot/core';
import { colors } from '../../theme/tokens';
import { fonts, type } from '../../theme/typography';
import { Sheet } from '../Sheet';
import { initials } from '../../lib/pipeline';

export interface CollaborateSheetProps {
  visible: boolean;
  onClose: () => void;
  dealTitle: string;
  collaborators: Collaborator[];
  onInvite: (email: string, role: 'edit' | 'view') => void;
  onCopyLink: () => void;
  onRemove: (collabId: string | number) => void;
  onToast: (msg: string) => void;
}

function roleLabel(c: Collaborator): string {
  if (c.pending) return 'Eingeladen';
  if (c.role === 'owner') return 'Eigentümer';
  if (c.role === 'edit') return 'Bearbeiten';
  return 'Ansehen';
}

export function CollaborateSheet({
  visible,
  onClose,
  dealTitle,
  collaborators,
  onInvite,
  onCopyLink,
  onRemove,
  onToast,
}: CollaborateSheetProps) {
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'edit' | 'view'>('edit');

  React.useEffect(() => {
    if (visible) {
      setEmail('');
      setRole('edit');
    }
  }, [visible]);

  const invite = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      onToast('E-Mail eingeben');
      return;
    }
    onInvite(trimmed, role);
    setEmail('');
    onToast(`Einladung an ${trimmed} gesendet`);
  };

  return (
    <Sheet visible={visible} onClose={onClose} testID="collab-sheet">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Zusammenarbeiten</Text>
          <Text style={styles.caption}>{dealTitle} · gemeinsam bearbeiten</Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button">
          <Text style={styles.fertig}>Fertig</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[type.monoLabel, styles.label]}>PERSON EINLADEN</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-Mail-Adresse"
          placeholderTextColor={colors.faintAlt}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          testID="collab-email"
        />
        <View style={styles.roleRow}>
          {(
            [
              { key: 'edit', label: 'Bearbeiten' },
              { key: 'view', label: 'Nur ansehen' },
            ] as { key: 'edit' | 'view'; label: string }[]
          ).map((opt) => {
            const active = opt.key === role;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setRole(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.roleChip, active && styles.roleChipOn]}
                testID={`collab-role-${opt.key}`}
              >
                <Text style={[styles.roleText, active && styles.roleTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={invite} accessibilityRole="button" style={styles.inviteBtn} testID="collab-invite">
          <Text style={styles.inviteText}>Einladen</Text>
        </Pressable>
        <Pressable onPress={onCopyLink} accessibilityRole="button" style={styles.copyBtn} testID="collab-copy">
          <Svg width={15} height={15} fill="none" stroke={colors.tealText} strokeWidth={1.7}>
            <Path d="M6 9a3 3 0 004 0l2-2a3 3 0 00-4-4l-1 1" />
            <Path d="M9 6a3 3 0 00-4 0L3 8a3 3 0 004 4l1-1" />
          </Svg>
          <Text style={styles.copyText}>Einladungslink kopieren</Text>
        </Pressable>

        <Text style={[type.monoLabel, styles.label, { marginTop: 20 }]}>
          MIT ZUGRIFF · {collaborators.length}
        </Text>
        <View style={styles.list}>
          {collaborators.map((c, i) => (
            <View
              key={c.id}
              style={[styles.listRow, i > 0 && styles.listDivider]}
              testID={`collab-row-${c.id}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {initials(c.name.replace(/\(.*\)/, '').trim())}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.rowEmail} numberOfLines={1}>
                  {c.email}
                </Text>
              </View>
              <Text
                style={[
                  styles.roleLabel,
                  { color: c.pending ? colors.yellow : colors.muted },
                ]}
              >
                {roleLabel(c)}
              </Text>
              {c.role !== 'owner' && (
                <Pressable
                  onPress={() => onRemove(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name} entfernen`}
                  hitSlop={8}
                  testID={`collab-remove-${c.id}`}
                >
                  <Svg width={14} height={14} fill="none" stroke="#c2bfb8" strokeWidth={1.8}>
                    <Path d="M3 3l8 8M11 3l-8 8" />
                  </Svg>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Sheet>
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
  title: {
    fontFamily: fonts.bricolage700,
    fontSize: 18,
    letterSpacing: -0.18,
    color: colors.ink,
  },
  caption: { fontFamily: fonts.hanken400, fontSize: 11, color: colors.muted, marginTop: 2 },
  fertig: { fontFamily: fonts.hanken600, fontSize: 14, color: colors.tealText },

  body: { paddingHorizontal: 20, paddingBottom: 26 },
  label: {},
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 13,
    fontFamily: fonts.hanken400,
    fontSize: 13.5,
    color: colors.ink,
    marginTop: 7,
  },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  roleChipOn: { borderColor: colors.ink },
  roleText: { fontFamily: fonts.hanken600, fontSize: 12, color: colors.muted2 },
  roleTextOn: { color: colors.ink },
  inviteBtn: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: colors.dark,
    borderRadius: 12,
  },
  inviteText: { fontFamily: fonts.hanken600, fontSize: 13.5, color: '#fff' },
  copyBtn: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  copyText: { fontFamily: fonts.hanken600, fontSize: 12.5, color: colors.tealText },

  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  listDivider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dfe6e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.hanken600, fontSize: 12, color: colors.teal },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: fonts.hanken600, fontSize: 13, color: colors.ink },
  rowEmail: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.muted2, marginTop: 1 },
  roleLabel: { fontFamily: fonts.mono600, fontSize: 10 },
});
