import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

type Props = {
  width?: number;
  variant?: 'dark' | 'white';
};

export default function Logo({ width = 120, variant = 'dark' }: Props) {
  const color = variant === 'dark' ? colors.dark : colors.white;
  return (
    <Text style={[styles.wordmark, { fontSize: width / 4.2, color }]}>{'TRANZET'}</Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    letterSpacing: 6,
    fontWeight: '900',
    textAlign: 'center',
  },
});