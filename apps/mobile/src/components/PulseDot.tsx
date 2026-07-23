/**
 * A small status dot with a soft pulsing ring — used for the "OFFEN · SCHWEBEND"
 * risk badge (README: "grau, roter Punkt" with a ring-shadow). The ring scales
 * out and fades on a gentle loop; the solid dot stays put.
 */

import * as React from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export interface PulseDotProps {
  size?: number;
  color?: string;
}

export function PulseDot({ size = 7, color = '#c1442d' }: PulseDotProps) {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID="pulse-dot">
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
});
