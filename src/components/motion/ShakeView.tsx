import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
} from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useMotion';

export type ShakeHandle = {
  /** Run the shake sequence once. */
  shake: () => void;
};

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  amplitude?: number;
  /** Duration of each half-swing in ms. */
  duration?: number;
};

/**
 * Imperative horizontal shake — for validation errors and "wrong code" feedback.
 */
const ShakeView = forwardRef<ShakeHandle, Props>(function ShakeView(
  { children, style, amplitude = 8, duration = 55 },
  ref
) {
  const reduced = useReducedMotion();
  const tx = useSharedValue(0);

  useEffect(() => {
    if (reduced) tx.value = 0;
  }, [reduced, tx]);

  const animate = useCallback(() => {
    if (reduced) return;
    tx.value = withSequence(
      withTiming(-amplitude, { duration }),
      withTiming(amplitude, { duration }),
      withTiming(-amplitude * 0.6, { duration }),
      withTiming(amplitude * 0.6, { duration }),
      withTiming(0, { duration })
    );
  }, [reduced, tx, amplitude, duration]);

  useImperativeHandle(ref, () => ({ shake: animate }), [animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <View>{children}</View>
    </Animated.View>
  );
});

export default ShakeView;