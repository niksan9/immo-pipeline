/**
 * Minimal gradient slider (hand-built with PanResponder — no extra deps).
 * Track is a gradient filled to the value (ink/teal) with the rest in #e6e3de;
 * the thumb is a white round knob with a border (per the handoff "Slider" spec).
 *
 * Testability: the root host View carries `testID` AND an `onValueChange` prop,
 * so tests can drive it directly with
 *   fireEvent(getByTestId('slider-zins'), 'valueChange', 4.5)
 * without simulating a native gesture. Real touch drags call the same handler.
 */

import * as React from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { colors } from '../theme/tokens';

const THUMB = 22;
const TRACK_H = 6;

// View alias that also accepts an `onValueChange` prop. RN ignores the extra
// prop at runtime, but RNTL's fireEvent can invoke it, which is how tests drive
// the slider without simulating a native pan gesture.
type ExtraProps = { onValueChange?: (value: number) => void };
const TrackView = View as unknown as React.ComponentType<
  React.ComponentProps<typeof View> & ExtraProps
>;

export interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  /** Filled-track colour (defaults to ink). */
  color?: string;
  testID?: string;
}

function clampSnap(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, raw));
  const snapped = Math.round((clamped - min) / step) * step + min;
  // Avoid FP dust (e.g. 3.8000000001).
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(snapped.toFixed(decimals));
}

export function Slider({
  min,
  max,
  step,
  value,
  onValueChange,
  color = colors.ink,
  testID,
}: SliderProps) {
  const widthRef = React.useRef(0);
  const [pct, setPct] = React.useState(0);

  React.useEffect(() => {
    const p = max === min ? 0 : (value - min) / (max - min);
    setPct(Math.max(0, Math.min(1, p)));
  }, [value, min, max]);

  const emitFromX = React.useCallback(
    (x: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const ratio = Math.max(0, Math.min(1, x / w));
      const raw = min + ratio * (max - min);
      onValueChange(clampSnap(raw, min, max, step));
    },
    [min, max, step, onValueChange],
  );

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => emitFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => emitFromX(e.nativeEvent.locationX),
      }),
    [emitFromX],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  return (
    <TrackView
      testID={testID}
      onValueChange={onValueChange}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      style={styles.hit}
      onLayout={onLayout}
      {...responder.panHandlers}
    >
      <View style={styles.trackBg} />
      <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      <View
        style={[
          styles.thumb,
          { left: `${pct * 100}%`, marginLeft: -THUMB / 2 },
        ]}
      />
    </TrackView>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: THUMB + 8,
    justifyContent: 'center',
    marginTop: 6,
  },
  trackBg: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: '#e6e3de',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
});
