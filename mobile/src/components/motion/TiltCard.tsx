import React, { useCallback } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useMotion';
import { spring } from './presets';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  /** Max tilt in degrees. Defaults to 9. */
  maxTilt?: number;
  scaleTo?: number;
  accessibilityLabel?: string;
};

/**
 * Interactive press-tilt card: tilts toward the touch point and rises on press,
 * then springs back. Adds a "physical" feel to selectable cards.
 */
export default function TiltCard({
  children,
  onPress,
  disabled,
  style,
  contentStyle,
  pressedStyle,
  maxTilt = 9,
  scaleTo = 0.96,
  accessibilityLabel,
}: Props) {
  const reduced = useReducedMotion();

  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      width.value = e.nativeEvent.layout.width;
      height.value = e.nativeEvent.layout.height;
    },
    [width, height]
  );

  const onPressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (reduced) return;
      const { locationX, locationY } = e.nativeEvent;
      const nx = width.value > 0 ? (locationX / width.value) * 2 - 1 : 0;
      const ny = height.value > 0 ? (locationY / height.value) * 2 - 1 : 0;
      ry.value = withSpring(-nx * maxTilt, spring.pressIn);
      rx.value = withSpring(ny * maxTilt, spring.pressIn);
      scale.value = withSpring(scaleTo, spring.pressIn);
      lift.value = withSpring(1, spring.pressIn);
    },
    [reduced, width, height, rx, ry, scale, lift, maxTilt, scaleTo]
  );

  const onPressOut = useCallback(() => {
    if (reduced) return;
    rx.value = withSpring(0, spring.pressOut);
    ry.value = withSpring(0, spring.pressOut);
    scale.value = withSpring(1, spring.pressOut);
    lift.value = withSpring(0, spring.pressOut);
  }, [reduced, rx, ry, scale, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
      { scale: scale.value },
      { translateY: lift.value * -3 },
    ],
  }));

  return (
    <Animated.View onLayout={onLayout} style={[style, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        style={({ pressed }) => [contentStyle, pressed && pressedStyle]}>
        {children}
      </Pressable>
    </Animated.View>
  );
}