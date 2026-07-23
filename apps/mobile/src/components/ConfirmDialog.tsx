/**
 * Minimal in-app confirmation dialog (RN Modal — no native Alert, so it is
 * testable). Centered card with a title, message and a cancel / confirm pair.
 * Used for the destructive "Deal löschen" flow.
 */

import * as React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { fonts } from '../theme/typography';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** true = destructive (red confirm). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  destructive,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root} testID={testID}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Schließen"
        />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={[styles.btn, styles.cancelBtn]}
              accessibilityRole="button"
              testID={testID ? `${testID}-cancel` : undefined}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.btn, destructive ? styles.confirmDanger : styles.confirmBtn]}
              accessibilityRole="button"
              testID={testID ? `${testID}-confirm` : undefined}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'rgba(20,19,17,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgApp,
    borderRadius: radii.card,
    padding: 20,
  },
  title: { fontFamily: fonts.bricolage700, fontSize: 17, letterSpacing: -0.17, color: colors.ink },
  message: {
    fontFamily: fonts.hanken400,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    marginTop: 8,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  cancelBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  cancelText: { fontFamily: fonts.hanken600, fontSize: 13.5, color: colors.ink2 },
  confirmBtn: { backgroundColor: colors.dark },
  confirmDanger: { backgroundColor: colors.red },
  confirmText: { fontFamily: fonts.hanken600, fontSize: 13.5, color: '#fff' },
});
