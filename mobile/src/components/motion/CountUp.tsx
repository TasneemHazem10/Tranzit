import React, { useEffect, useState } from 'react';
import { Text, TextProps } from 'react-native';
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  value: number;
  /** Total animation duration in ms. Defaults to 420. */
  duration?: number;
  /** Renders the formatted number — use for locale/currency formatting. */
  format?: (n: number) => string;
  /** Reverse easing curve (the "progress" of the animation). */
  easing?: (n: number) => number;
  textProps?: Omit<TextProps, 'children'>;
};

/**
 * Animated number: on `value` change it eases from the old value to the new one.
 * The text itself re-renders on the JS thread, keeping rendering simple and safe
 * across native + web while the movement is driven by a Reanimated timing curve.
 */
export default function CountUp({
  value,
  duration = 420,
  format = (n) => String(n),
  easing,
  textProps,
}: Props) {
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(value);
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    setFrom(to);
    setTo(value);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration,
      easing: easing ?? Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useAnimatedReaction(
    () => progress.value,
    (p, prev) => {
      if (p === prev) return;
      runOnJS(lerp)(from, to, p, format, setDisplay);
    }
  );

  return <Text {...textProps}>{display}</Text>;
}

function lerp(
  from: number,
  to: number,
  p: number,
  format: (n: number) => string,
  setDisplay: (s: string) => void
) {
  setDisplay(format(from + (to - from) * p));
}