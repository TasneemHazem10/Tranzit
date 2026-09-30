import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './Motion';
import { useLanguage } from '../store/language';
import { fonts, radius, useTheme, type ThemeColors } from '../theme';

type Props = { onPress?: () => void; disabled?: boolean };

export default function GoogleButton({ onPress, disabled }: Props) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t, isRTL } = useLanguage();

  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      contentStyle={[
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        styles.button,
      ]}
      pressedStyle={{ opacity: 0.85 }}
      scaleTo={0.97}>
      <View style={styles.badge}>
        <Text style={styles.g}>G</Text>
      </View>
      <Text style={styles.text}>{t.googleSignIn}</Text>
    </PressableScale>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1.2,
    borderColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  g: {
    color: '#4285F4',
    fontSize: 13,
    fontWeight: '900',
  },
  text: {
    color: colors.dark,
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
});
