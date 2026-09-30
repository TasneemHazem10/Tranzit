import React, { useEffect } from 'react';
import { Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/useMotion';
import { useTheme, type ThemeColors } from '../theme';
import Logo from './Logo';
import { spring } from './motion/presets';

export default function AnimatedSplash() {
  'use no memo';
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const logoFade = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const roadT = useSharedValue(0);
  const ringT = useSharedValue(0);
  const shimmerT = useSharedValue(0);

  useEffect(() => {
    logoFade.value = withTiming(1, { duration: 550 });
    logoScale.value = withSpring(1, spring.entrance);
    if (reduced) return;
    roadT.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1);
    ringT.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1
    );
    shimmerT.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.linear }),
      -1,
      true
    );
  }, [reduced, logoFade, logoScale, roadT, ringT, shimmerT]);

  const logoSize = Math.min(width * 0.42, 175);

  const path = width * 1.35;
  const lead = -width;
  const travel = path - lead;

  const roadX = (t: number, offset: number) =>
    interpolate(t, [0, 1], [lead - offset, path - offset]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoFade.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ringT.value, [0, 1], [1, 1.55]) }],
    opacity: interpolate(ringT.value, [0, 1], [0.45, 0]),
  }));

  const dashStyleA = useAnimatedStyle(() => ({
    transform: [{ translateX: roadX(roadT.value, 0) }, { rotate: '-1.4deg' }],
  }));
  const dashStyleB = useAnimatedStyle(() => ({
    transform: [{ translateX: roadX(roadT.value, travel) }, { rotate: '-1.4deg' }],
  }));
  const solidStyleA = useAnimatedStyle(() => ({
    transform: [{ translateX: roadX(roadT.value, 0) }, { rotate: '-1.4deg' }],
  }));
  const solidStyleB = useAnimatedStyle(() => ({
    transform: [{ translateX: roadX(roadT.value, travel) }, { rotate: '-1.4deg' }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.abs(shimmerT.value - 0.5) * 2 }));

  return (
    <View style={[styles.container, { height }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.brandDeep, colors.brand, '#FF6249']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {!reduced && (
        <View style={styles.roads} pointerEvents="none">
          <Animated.View
            style={[styles.roadDash, { width: width * 1.25, top: height * 0.14 }, dashStyleA]}
          />
          <Animated.View
            style={[styles.roadDash, { width: width * 1.25, top: height * 0.14 }, dashStyleB]}
          />
          <Animated.View
            style={[styles.roadSolid, { width: width * 1.25, bottom: height * 0.3 }, solidStyleA]}
          />
          <Animated.View
            style={[styles.roadSolid, { width: width * 1.25, bottom: height * 0.3 }, solidStyleB]}
          />
        </View>
      )}

      {/* Center logo with pulse ring */}
      <View style={styles.logoWrap}>
        {!reduced && (
          <Animated.View
            style={[
              styles.ring,
              {
                width: logoSize * 1.75,
                height: logoSize * 1.75,
                borderRadius: logoSize * 0.875,
              },
              ringStyle,
            ]}
          />
        )}
        <Animated.View style={logoStyle}>
          <Logo width={logoSize} variant="white" />
        </Animated.View>
      </View>

      {/* Bottom shimmer bar */}
      {!reduced && (
        <Animated.View
          style={[
            styles.shimmerBar,
            { bottom: height * 0.16, width: width * 0.36 },
            shimmerStyle,
          ]}>
          <View style={styles.shimmerInner} />
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roads: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  roadDash: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.white,
  },
  roadSolid: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white + '88',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.white + '99',
    backgroundColor: colors.white + '11',
  },
  shimmerBar: {
    position: 'absolute',
    alignSelf: 'center',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.onboardingYellow + '55',
    overflow: 'hidden',
  },
  shimmerInner: {
    width: '55%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.onboardingYellow,
  },
});