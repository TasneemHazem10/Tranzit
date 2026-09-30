import React, { useEffect } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useMotion';
import { fonts, radius, useTheme } from '../theme';

export type SegOption<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  options: SegOption<T>[];
  value: T;
  onChange: (next: T) => void;
  activeColor?: string;
  activeTextColor?: string;
};

/** Animated segmented control with a sliding active pill. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor,
  activeTextColor,
}: Props<T>) {
  const reduced = useReducedMotion();
  const c = useTheme();
  const width = useSharedValue(0);
  const slot = useSharedValue(0);

  useEffect(() => {
    const idx = Math.max(0, options.findIndex(o => o.value === value));
    slot.value = withSpring(idx, {
      damping: 18,
      stiffness: 240,
      mass: 0.6,
      overshootClamping: reduced,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  };

  const pillStyle = useAnimatedStyle(() => {
    const itemW = width.value / options.length;
    return {
      width: itemW,
      transform: [{ translateX: slot.value * itemW }],
    };
  });

  const textStyle = (isActive: boolean) => ({
    color: isActive ? (activeTextColor ?? c.white) : c.textGray,
  });

  return (
    <View style={[styles.wrap, { backgroundColor: c.background, borderColor: c.border }]} onLayout={onLayout}>
      <Animated.View style={[styles.pill, pillStyle]}>
        <LinearGradient
          colors={[activeColor ?? c.brand, c.brandDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            onPress={() => onChange(opt.value)}
            style={styles.option}>
            <Text style={[styles.label, textStyle(active)]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.full,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
    height: 34,
    minWidth: 150,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  pill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
});