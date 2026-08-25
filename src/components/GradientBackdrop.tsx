import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

type Props = {
  from: string;
  children?: React.ReactNode;
};

/** Soft color fading to white — matches the onboarding/auth screens. */
export default function GradientBackdrop({ from, children }: Props) {
  return (
    <LinearGradient
      colors={[from, `${from}66`, colors.white]}
      locations={[0, 0.45, 1]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}

export const GradientColors = {
  blue: colors.onboardingBlue,
  yellow: colors.onboardingYellow,
  purple: colors.onboardingPurple,
  peach: '#F3C6A5',
  softGray: '#D9D9D9',
};
