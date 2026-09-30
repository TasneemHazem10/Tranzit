import React, { useEffect } from 'react';
import { Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMotionActive } from '../hooks/useMotion';
import { colors as themeColors, useTheme, type ThemeColors } from '../theme';

const { width, height } = Dimensions.get('window');

type OrbitProps = {
  size: number;
  color: string;
  top: number;
  left: number;
  duration: number;
  driftX?: number;
  active: boolean;
};

/** Soft floating gradient orb (single bob loop; scale derives from it). */
function Orbit({ size, color, top, left, duration, driftX = 30, active }: OrbitProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const y = useSharedValue(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    const easing = Easing.inOut(Easing.sin);
    y.value = withRepeat(
      withTiming(1, { duration, easing: easeOut(easing) }),
      -1,
      true
    );
    x.value = withRepeat(
      withTiming(1, { duration: duration * 1.4, easing: easeOut(easing) }),
      -1,
      true
    );
    return () => {
      y.value = 0;
      x.value = 0;
    };
  }, [y, x, duration, active]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -y.value * 26 },
      { translateX: x.value * driftX },
      { scale: 1 + y.value * 0.12 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orbit,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top,
          left,
          opacity: 0.55,
        },
        style,
      ]}>
      <LinearGradient
        colors={[`${color}55`, `${color}00`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
      />
    </Animated.View>
  );
}

function easeOut(easing: (v: number) => number) {
  'worklet';
  return (v: number) => 1 - easing(1 - v);
}

/**
 * Animated decorative backdrop for auth screens:
 * a soft brand gradient + gently drifting orbs. Place underneath content.
 * Loops pause when the screen is covered, the app is in the background,
 * or the user enables "reduce motion".
 */
export default function AuthBackdrop({ primary = themeColors.brand, secondary = themeColors.brandSoft }: { primary?: string; secondary?: string }) {
  const colors = useTheme();
  const active = useMotionActive();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[secondary, colors.background, colors.card, colors.card]}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Orbit active={active} size={240} color={primary} top={-70} left={-80} duration={5200} driftX={40} />
      <Orbit active={active} size={170} color={colors.orange} top={height * 0.12} left={width - 130} duration={6400} driftX={-36} />
      <Orbit active={active} size={130} color={colors.onboardingYellow} top={height * 0.62} left={-50} duration={5800} driftX={46} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  orbit: {
    position: 'absolute',
    overflow: 'hidden',
  },
});