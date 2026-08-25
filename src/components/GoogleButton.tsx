import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

type Props = { onPress?: () => void; disabled?: boolean };

/**
 * Google sign-in button.
 *
 * Real Google Sign-In requires a development build with
 * @react-native-google-signin/google-signin + GOOGLE_CLIENT_ID configured on
 * the backend. Until then this shows an explanatory alert when pressed.
 */
export default function GoogleButton({ onPress, disabled }: Props) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
      <View style={styles.badge}>
        <Text style={styles.g}>G</Text>
      </View>
      <Text style={styles.text}>التسجيل بواسطة جوجل</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
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
