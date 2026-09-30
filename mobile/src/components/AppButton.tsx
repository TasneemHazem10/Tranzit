import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useMotion';
import { fonts, radius, useTheme, type ThemeColors } from '../theme';
import { spring } from './motion/presets';

const SHEEN_WIDTH = 64;

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const SIZES = {
  md: { height: 48, radius: radius.full, fontSize: 15 },
  lg: { height: 54, radius: radius.full, fontSize: 16 },
};

export default function AppButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}: Props) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const reduced = useReducedMotion();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isOutline = variant === 'outline';
  const dims = SIZES[size];

  const scale = useSharedValue(1);
  const lift = useSharedValue(1);
  const pressedFlash = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    if (!isPrimary || disabled || loading || reduced) return;
    shine.value = withRepeat(
      withSequence(
        withDelay(
          1500,
          withTiming(1, { duration: 900 })
        ),
        withTiming(0, { duration: 0 })
      ),
      -1
    );
    return () => {
      shine.value = 0;
    };
  }, [shine, isPrimary, disabled, loading, reduced]);

  const onPressIn = () => {
    scale.value = withSpring(0.96, spring.pressIn);
    lift.value = withTiming(0, { duration: 90 });
    pressedFlash.value = withTiming(1, { duration: 90 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, spring.pressOut);
    lift.value = withTiming(1, { duration: 180 });
    pressedFlash.value = withTiming(0, { duration: 140 });
  };

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: (1 - lift.value) * 3 },
    ],
  }));

  const pressOverlayStyle = useAnimatedStyle(() => ({
    opacity: pressedFlash.value * 0.16,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value,
    transform: [{ translateX: -SHEEN_WIDTH + shine.value * (500 + SHEEN_WIDTH * 2) }],
  }));

  const background =
    isPrimary ? (
      <LinearGradient colors={[colors.brand, colors.brandDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    ) : isDanger ? (
      <LinearGradient colors={['#FF4D4D', colors.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    ) : null;

  const content = loading ? (
    <ActivityIndicator color={isPrimary || isDanger ? colors.white : colors.brandDeep} />
  ) : (
    <Text
      style={[
        styles.text,
        { fontSize: dims.fontSize, color: isPrimary || isDanger ? colors.white : isOutline ? colors.brandDeep : colors.dark },
        textStyle,
      ]}>
      {title}
    </Text>
  );

  const innerHighlight =
    isPrimary || isDanger ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' } : null;

  return (
    <Animated.View style={[styles.constrained, outerStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.base,
          { height: dims.height, borderRadius: dims.radius },
          isPrimary
            ? styles.primaryShadow
            : isDanger
              ? styles.dangerShadow
              : isOutline
                ? styles.outline
                : styles.ghost,
          innerHighlight,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
        ]}>
        {background}
        <Animated.View pointerEvents="none" style={[styles.pressOverlay, pressOverlayStyle]} />
        {isPrimary && !reduced && (
          <Animated.View pointerEvents="none" style={[styles.shineWrap, shineStyle]}>
            <View style={styles.sheen} />
          </Animated.View>
        )}
        {content}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  constrained: {
    alignSelf: 'center',
    width: '80%',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    width: '100%',
    overflow: 'hidden',
  },
  pressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderRadius: radius.full,
  },
  primaryShadow: {
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
    backgroundColor: colors.brand,
  },
  dangerShadow: {
    shadowColor: '#7A0C08',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
    backgroundColor: colors.red,
  },
  outline: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1.5,
    borderColor: colors.brand + '4D',
  },
  ghost: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.divider,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.94,
  },
  text: {
    fontFamily: fonts.bold,
    letterSpacing: 0.2,
  },
  shineWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHEEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheen: {
    width: SHEEN_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.16,
    transform: [{ skewX: '-20deg' }],
  },
});