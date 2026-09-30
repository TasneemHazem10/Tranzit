import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, Pulse } from './Motion';
import { useLanguage } from '../store/language';
import { useReducedMotion } from '../hooks/useMotion';
import { useTheme, type ThemeColors } from '../theme';

export type LocationState = 'idle' | 'detecting' | 'ready' | 'denied' | 'error';

type Props = {
  state: LocationState;
  onPress: () => void;
};

const SIZE = 42;

export default function LocateButton({ state, onPress }: Props) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const spin = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    if (state === 'detecting') {
      spin.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1
      );
      return () => cancelAnimation(spin);
    }
    spin.value = withTiming(0, { duration: 260 });
  }, [state, reduced, spin]);

  useEffect(() => {
    if (state !== 'ready') return;
    pop.value = withSequence(
      withSpring(1.28, { damping: 12, stiffness: 260 }),
      withSpring(1, { damping: 16, stiffness: 200 })
    );
    return () => cancelAnimation(pop);
  }, [state, pop]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const locating = state === 'detecting';

  const iconName = locating
    ? 'navigate'
    : state === 'denied'
      ? 'lock-closed'
      : state === 'error'
        ? 'warning'
        : 'locate';

  const iconColor =
    state === 'denied' || state === 'error' ? colors.red : colors.brand;

  const statusDot = (() => {
    if (locating) return null;
    if (state === 'ready') {
      return (
        <View style={styles.statusWrap} pointerEvents="none">
          <Pulse color={colors.green} size={12} duration={1600} />
          <View style={[styles.statusDot, { backgroundColor: colors.green }]} />
        </View>
      );
    }
    if (state === 'denied' || state === 'error') {
      return (
        <View style={styles.statusWrap} pointerEvents="none">
          <View style={[styles.statusDot, { backgroundColor: colors.red }]} />
        </View>
      );
    }
    return (
      <View style={styles.statusWrap} pointerEvents="none">
        <View style={[styles.statusDot, { backgroundColor: colors.brand }]} />
      </View>
    );
  })();

  return (
    <PressableScale
      onPress={onPress}
      disabled={locating}
      scaleTo={0.88}
      pressedStyle={{ opacity: 0.9 }}
      contentStyle={styles.container}
      accessibilityLabel={
        locating ? t.homeLocDetecting : t.homeLocRelocate
      }>
      <LinearGradient
        colors={[colors.card, colors.brandSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.icon, locating ? spinStyle : popStyle]}>
        <Ionicons name={iconName} size={19} color={iconColor} />
      </Animated.View>
      {statusDot}
    </PressableScale>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    borderColor: colors.brand + '40',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  icon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusWrap: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});