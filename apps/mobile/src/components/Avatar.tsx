import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';
import { type } from '../theme/typography';

/** Stacked collaborator initial-avatars (−6px overlap), for shared deals. */
export function AvatarStack({ initials }: { initials: string[] }) {
  if (initials.length === 0) return null;
  return (
    <View style={styles.stack}>
      {initials.map((ini, i) => (
        <View key={`${ini}-${i}`} style={[styles.avatar, i > 0 && styles.overlap]}>
          <Text style={styles.text}>{ini}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', paddingLeft: 6 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dfe6e8',
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlap: { marginLeft: -6 },
  text: { ...type.avatar },
});
