import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { PressableScale } from './Motion';
import { spring } from './motion/presets';
import { useTheme, type ThemeColors } from '../theme';

type Props = {
  rating: number;
  onChange?: (stars: number) => void;
  size?: number;
};

export default function Stars({ rating, onChange, size = 34 }: Props) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.round(rating);
        return onChange ? (
          <StarButton key={i} filled={filled} size={size} onPress={() => onChange(i)} />
        ) : (
          <StarIcon key={i} filled={filled} size={size} />
        );
      })}
    </View>
  );
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <View>
      <Ionicons
        name={filled ? 'star' : 'star-outline'}
        size={size}
        color={filled ? colors.brandDeep : colors.border}
        style={filled ? styles.filled : undefined}
      />
    </View>
  );
}

function StarButton({
  filled,
  size,
  onPress,
}: {
  filled: boolean;
  size: number;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const scale = useSharedValue(1);
  const prevFilled = useRef(filled);

  useEffect(() => {
    if (filled && !prevFilled.current) {
      scale.value = withSequence(withSpring(1.28, spring.pop), withSpring(1, spring.pressOut));
    }
    prevFilled.current = filled;
  }, [filled, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale onPress={onPress} contentStyle={styles.starBtn} scaleTo={0.82}>
      <Animated.View style={style}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? colors.brandDeep : colors.border}
          style={filled ? styles.filled : undefined}
        />
      </Animated.View>
    </PressableScale>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 6,
  },
  starBtn: {
    padding: 2,
  },
  filled: {
    textShadowColor: colors.brand + '55',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});