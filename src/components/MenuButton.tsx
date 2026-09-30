import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PressableScale } from './Motion';
import { spring } from './motion/presets';
import { useTheme, type ThemeColors } from '../theme';

const LINE_WIDTH = 18;
const LINE_HEIGHT = 2;
const LINE_GAP = 5;

type Props = {
  open: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export default function MenuButton({ open, onPress, style }: Props) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const prog = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    prog.value = withSpring(open ? 1 : 0, spring.toggle);
  }, [open, prog]);

  const topStyle = useAnimatedStyle(() => {
    const p = prog.value;
    return {
      transform: [
        { rotate: `${p * 45}deg` },
        { translateY: p * LINE_GAP },
      ],
    };
  });
  const midStyle = useAnimatedStyle(() => {
    const p = prog.value;
    return {
      opacity: interpolate(p, [0, 0.4, 1], [1, 0, 0]),
      transform: [{ scaleX: interpolate(p, [0, 1], [1, 0.2]) }],
    };
  });
  const bottomStyle = useAnimatedStyle(() => {
    const p = prog.value;
    return {
      transform: [
        { rotate: `${-p * 45}deg` },
        { translateY: -p * LINE_GAP },
      ],
    };
  });

  return (
    <PressableScale
      onPress={onPress}
      style={style}
      scaleTo={0.88}
      pressedStyle={{ opacity: 0.9 }}
      contentStyle={styles.container}
      accessibilityLabel="menu">
      <LinearGradient
        colors={[colors.card, colors.brandSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ring}>
        <Animated.View style={[styles.line, topStyle]} />
        <Animated.View style={[styles.line, midStyle]} />
        <Animated.View style={[styles.line, bottomStyle]} />
      </View>
    </PressableScale>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  ring: {
    gap: LINE_GAP,
    alignItems: 'center',
  },
  line: {
    width: LINE_WIDTH,
    height: LINE_HEIGHT,
    borderRadius: LINE_HEIGHT,
    backgroundColor: colors.brand,
  },
});