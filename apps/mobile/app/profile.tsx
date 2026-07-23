import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useSession, signOut } from '../src/lib/auth-client';
import { useSyncStatus } from '../src/lib/syncStatus';
import { colors, radii, spacing } from '../src/theme/tokens';
import { fonts, type } from '../src/theme/typography';
import type { SyncStatus } from '../src/lib/sync';

/** Short German label + accent colour for the sync indicator. */
function syncLabel(status: SyncStatus): { text: string; color: string } {
  if (status.phase === 'offline')
    return { text: 'Offline – Änderungen werden lokal gesichert', color: colors.yellow };
  if (status.phase === 'error')
    return { text: 'Sync-Fehler – wird erneut versucht', color: colors.red };
  if (status.pending > 0 || status.phase === 'syncing')
    return { text: `Synchronisiert … (${status.pending} ausstehend)`, color: colors.teal };
  return { text: 'Alles synchronisiert', color: colors.green };
}

function formatLastSync(ms: number | null): string {
  if (ms == null) return 'noch nie';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} Uhr`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: session } = useSession();
  const status = useSyncStatus();
  const [signingOut, setSigningOut] = React.useState(false);

  const email = session?.user?.email ?? '—';
  const name = session?.user?.name ?? 'Profil';
  const sync = syncLabel(status);

  const onSignOut = React.useCallback(async () => {
    setSigningOut(true);
    try {
      // Clears the session only; local (offline) data stays on device.
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.headerWrap, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Zurück"
            hitSlop={10}
            testID="profile-back"
          >
            <Text style={styles.back}>‹ Zurück</Text>
          </Pressable>
          <Text style={type.screenTitle}>Profil</Text>
          <View style={{ width: 56 }} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name[0] ?? 'D').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name} testID="profile-name">
            {name}
          </Text>
          <Text style={styles.email} testID="profile-email">
            {email}
          </Text>
        </View>

        <Text style={[type.monoLabel, styles.sectionLabel]}>SYNC-STATUS</Text>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: sync.color }]} />
            <Text style={styles.statusText} testID="profile-sync-status">
              {sync.text}
            </Text>
          </View>
          <Text style={styles.statusMeta} testID="profile-sync-last">
            Letzte Synchronisierung: {formatLastSync(status.lastSyncAt)}
          </Text>
        </View>

        <Pressable
          onPress={onSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          style={[styles.signOut, signingOut && { opacity: 0.6 }]}
          testID="profile-sign-out"
        >
          <Text style={styles.signOutText}>
            {signingOut ? 'Wird abgemeldet …' : 'Abmelden'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  headerWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: spacing.sm,
  },
  back: { fontFamily: fonts.hanken600, fontSize: 14, color: colors.tealText, width: 56 },
  body: { padding: spacing.screen, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.card,
    padding: 18,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontFamily: fonts.bricolage700, fontSize: 22, color: colors.teal },
  name: { fontFamily: fonts.hanken700, fontSize: 16, color: colors.ink },
  email: { fontFamily: fonts.mono400, fontSize: 12, color: colors.muted, marginTop: 3 },
  sectionLabel: { marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'stretch' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontFamily: fonts.hanken600, fontSize: 13.5, color: colors.ink2, flex: 1 },
  statusMeta: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.muted,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  signOut: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.red,
    backgroundColor: colors.surface,
  },
  signOutText: { fontFamily: fonts.hanken600, fontSize: 14.5, color: colors.red },
});
