/**
 * Shared toast: dark pill, bottom-centered, green check, ~2.2 s, fade+slide-up.
 * Extracted so the Pipeline and Deal-Detail screens share one implementation.
 */

import * as React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { type } from '../theme/typography';
import { CheckIcon } from './icons';

const VISIBLE_MS = 2200;

export interface ToastController {
  message: string | null;
  opacity: Animated.Value;
  translateY: Animated.Value;
  show: (msg: string) => void;
}

/** Toast state + animation controller. Pair with <Toast />. */
export function useToast(): ToastController {
  const [message, setMessage] = React.useState<string | null>(null);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(10)).current;
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback(
    (msg: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(msg);
      opacity.setValue(0);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setMessage(null));
      }, VISIBLE_MS);
    },
    [opacity, translateY],
  );

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, opacity, translateY, show };
}

export interface ToastProps {
  controller: ToastController;
  /** Distance from the bottom edge (px). */
  bottom: number;
}

export function Toast({ controller, bottom }: ToastProps) {
  const { message, opacity, translateY } = controller;
  if (message == null) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { bottom, opacity, transform: [{ translateY }] },
      ]}
    >
      <CheckIcon size={16} color={colors.green} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: '88%',
    backgroundColor: colors.dark,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.button,
  },
  text: { ...type.body, color: '#f4f2ef' },
});
