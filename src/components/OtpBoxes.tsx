import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import { colors, fonts, radius } from '../theme';

type Props = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
};

export default function OtpBoxes({ length = 4, value, onChange }: Props) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const clean = digit.replace(/[^0-9]/g, '');
    if (!clean && digits[index]) {
      // deleting
      const next = value.split('');
      next[index] = '';
      onChange(next.join('').replace(/\s+/g, ''));
      return;
    }
    if (!clean) return;

    const chars = Array.from({ length }, (_, i) => value[i] ?? ' ');
    chars[index] = clean[0];
    const joined = chars.join('').trimEnd();
    onChange(joined);

    if (clean.length > 1) return; // paste handled below
    if (index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={r => {
            refs.current[i] = r;
          }}
          style={[styles.box, focusedIndex === i && styles.focused]}
          value={d === ' ' ? '' : d}
          onChangeText={t => setDigit(i, t)}
          onFocus={() => setFocusedIndex(i)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 24,
  },
  box: {
    width: 64,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    fontSize: 26,
    fontFamily: fonts.bold,
    color: colors.dark,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  focused: {
    borderColor: colors.dark,
  },
});
