import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './Motion';
import { useTheme, colors as themeColors } from '../theme';

type Variant = 'light' | 'primary' | 'dark' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, number> = { sm: 36, md: 42, lg: 50 };
const ICON_SIZES: Record<Size, number> = { sm: 18, md: 20, lg: 24 };

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: Size;
  variant?: Variant;
  /** Overrides the solid background color (primary/danger/dark variants). */
  tint?: string;
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle; // outer pressable hit-area style
};

export default function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'light',
  tint,
  color,
  disabled,
  accessibilityLabel,
  style,
}: Props) {
  const colors = useTheme();
  const dim = SIZES[size];
  const solid = variant === 'primary' || variant === 'dark' || variant === 'danger';

  let gradient: [string, string] | null = null;
  let bgColor: string | undefined;
  let border: ViewStyle | undefined;
  let iconColor = color;
  if (variant === 'primary') {
    gradient = [tint ?? colors.brand, colors.brandDeep];
    iconColor = color ?? colors.white;
  } else if (variant === 'danger') {
    gradient = ['#FF4D4D', '#C91A13'];
    iconColor = color ?? colors.white;
  } else if (variant === 'dark') {
    gradient = [themeColors.dark, '#2C2C2B'];
    iconColor = color ?? colors.white;
  } else if (variant === 'outline') {
    bgColor = 'transparent';
    border = { borderWidth: 1.5, borderColor: colors.brand + '59' };
    iconColor = color ?? colors.brandDeep;
  } else if (tint) {
    bgColor = tint;
    iconColor = color ?? colors.white;
  } else {
    bgColor = colors.background;
    border = { borderWidth: 1, borderColor: colors.divider };
    iconColor = color ?? colors.dark;
  }

  const shape = [
    styles.round,
    { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bgColor },
    border,
  ];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      style={style}
      contentStyle={shape}
      pressedStyle={{ opacity: 0.82 }}
      accessibilityLabel={accessibilityLabel}>
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.absoluteFill}
        />
      ) : null}
      {solid && (
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.absoluteFill}
        />
      )}
      <Ionicons name={icon} size={ICON_SIZES[size]} color={iconColor} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});