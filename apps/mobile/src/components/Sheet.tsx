/**
 * Reusable bottom sheet (hand-built with RN Modal + Animated — no extra deps).
 * Slides up translateY(100%)→0 over .28s cubic-bezier(.2,.8,.2,1); backdrop
 * rgba(20,19,17,.4) fades in. Tapping the backdrop closes it.
 */

import * as React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '../theme/tokens';

const IN_MS = 280;
const OUT_MS = 200;
// Approximation of cubic-bezier(.2,.8,.2,1) — a soft decelerate.
const EASE_IN = Easing.bezier(0.2, 0.8, 0.2, 1);

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}

export function Sheet({ visible, onClose, children, testID }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = React.useState(visible);
  const translateY = React.useRef(new Animated.Value(height)).current;
  const backdrop = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setRendered(true);
      translateY.setValue(height);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: IN_MS,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: IN_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height,
          duration: OUT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 0,
          duration: OUT_MS,
          useNativeDriver: true,
        }),
      ]).start(() => setRendered(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, height]);

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.root} testID={testID}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            testID={testID ? `${testID}-backdrop` : undefined}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: height * 0.94, paddingBottom: insets.bottom + 12 },
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,19,17,0.4)',
  },
  sheet: {
    backgroundColor: colors.bgApp,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 24,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.railDiscarded,
    alignSelf: 'center',
    marginBottom: 8,
  },
});
