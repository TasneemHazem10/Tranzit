import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text } from 'react-native';

type Props = {
  width?: number;
  variant?: 'dark' | 'white';
  fallbackText?: boolean;
};

let darkSource: ImageSourcePropType | null = null;
let whiteSource: ImageSourcePropType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  darkSource = require('../../assets/images/logo-dark.png');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  whiteSource = require('../../assets/images/logo-white.png');
} catch {}

export default function Logo({ width = 120, variant = 'dark', fallbackText = true }: Props) {
  const source = variant === 'dark' ? darkSource : whiteSource;

  if (!source && fallbackText) {
    return (
      <Text
        style={{
          fontSize: width / 4.2,
          letterSpacing: 6,
          fontWeight: '900',
          color: variant === 'dark' ? '#1E1E1C' : '#FFFFFF',
          textAlign: 'center',
        }}>
        TRANZIT
      </Text>
    );
  }

  if (!source) return null;

  return (
    <Image
      source={source}
      style={[styles.image, { width, resizeMode: 'contain', tintColor: undefined }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    height: undefined,
    aspectRatio: 256 / 96,
    alignSelf: 'center',
  },
});
