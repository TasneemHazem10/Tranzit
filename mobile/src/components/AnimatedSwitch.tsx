import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useMotion';
import { radius, useTheme } from '../theme';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

const TRACK_W = 52;
const TRACK_H = 30;
const THUMB = 24;
const PAD = 3;
const ON_X = TRACK_W - THUMB - PAD * 2;

/** Modern iOS-style switch driven by a UI-thread spring. */
export default function AnimatedSwitch({ value, onValueChange, disabled }: Props) {
  const reduced = useReducedMotion();
  const c = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 17,
      stiffness: 260,
      mass: 0.6,
      overshootClamping: reduced,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: c.brand,
    opacity: progress.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * ON_X }],
  }));

  const press = useCallback(() => {
    if (disabled) return;
    onValueChange(!value);
  }, [disabled, onValueChange, value]);

  return (
    <Pressable onPress={press} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={[styles.track, { backgroundColor: c.divider, borderColor: c.border }, disabled && styles.trackDisabled]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.trackActive, trackStyle]}>
          <LinearGradient
            colors={[c.brand, c.brandDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.thumb, { backgroundColor: c.white }, thumbStyle]}>
          <View style={styles.thumbGlow} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: PAD,
  },
  trackDisabled: {
    opacity: 0.5,
  },
  trackActive: {
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 0,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 3,
  },
  thumbGlow: {
    width: THUMB - 12,
    height: THUMB - 12,
    borderRadius: (THUMB - 12) / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});