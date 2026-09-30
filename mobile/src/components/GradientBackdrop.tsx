import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

type Props = {
  from: string;
  children?: React.ReactNode;
};

/** Soft color fading to white — matches the onboarding/auth screens. */
export default function GradientBackdrop({ from, children }: Props) {
  const colors = useTheme();
  return (
    <LinearGradient
      colors={[from, `${from}88`, colors.card, colors.card]}
      locations={[0, 0.22, 0.58, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

export const GradientColors = {
  blue: '#E3E3DF',
  yellow: '#D6D6D0',
  purple: '#C9C9C2',
  peach: '#E9E7E2',
  softGray: '#DEDEDA',
};
