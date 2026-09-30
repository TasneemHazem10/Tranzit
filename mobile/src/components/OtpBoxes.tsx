import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Entrance } from './Motion';
import ShakeView, { type ShakeHandle } from './motion/ShakeView';
import { spring } from './motion/presets';
import { fonts, radius, useTheme, type ThemeColors } from '../theme';

type Props = {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  /** Bump this counter to shake the row (e.g. wrong-code feedback). */
  shakeKey?: number;
};

const OtpBoxes = forwardRef<ShakeHandle, Props>(function OtpBoxes(
  { length = 4, value, onChange, shakeKey = 0 },
  ref
) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const refs = useRef<(TextInput | null)[]>([]);
  const shakeRef = useRef<ShakeHandle | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Forward shake for parent-level control.
  useImperativeHandle(ref, () => ({ shake: () => shakeRef.current?.shake() }), []);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (shakeKey > 0) shakeRef.current?.shake();
  }, [shakeKey]);

  const setDigit = useCallback(
    (index: number, digit: string) => {
      const clean = digit.replace(/[^0-9]/g, '');
      const current = value ?? '';
      if (!clean && current[index]) {
        const next = current.split('');
        next[index] = '';
        onChange(next.join('').replace(/\s+/g, ''));
        return;
      }
      if (!clean) return;

      const chars = Array.from({ length }, (_, i) => current[i] ?? ' ');
      chars[index] = clean[0];
      onChange(chars.join('').trimEnd());

      if (clean.length > 1) return; // pasted code, handled by parent
      if (index < length - 1) refs.current[index + 1]?.focus();
    },
    [value, onChange, length]
  );

  return (
    <ShakeView ref={shakeRef} amplitude={9}>
      <View style={styles.row}>
        {digits.map((d, i) => (
          <Entrance key={i} direction="up" distance={12} delay={i * 60}>
            <OtpBox
              ref={r => {
                refs.current[i] = r;
              }}
              digit={d}
              index={i}
              focused={focusedIndex === i}
              onFocus={() => setFocusedIndex(i)}
              onSetDigit={setDigit}
              onFocusPrev={() => {
                if (i > 0) refs.current[i - 1]?.focus();
              }}
            />
          </Entrance>
        ))}
      </View>
    </ShakeView>
  );
});

type OtpBoxProps = {
  digit: string;
  index: number;
  focused: boolean;
  onFocus: () => void;
  onSetDigit: (index: number, digit: string) => void;
  onFocusPrev: () => void;
};

const OtpBox = forwardRef<TextInput, OtpBoxProps>(function OtpBox(
  { digit, index, focused, onFocus, onSetDigit, onFocusPrev },
  ref
) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const filled = !!digit;

  const focus = useSharedValue(focused ? 1 : 0);
  const popScale = useSharedValue(1);
  const caret = useSharedValue(1);
  const prevFilled = useRef(filled);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, spring.appear);
  }, [focused, focus]);

  useEffect(() => {
    if (filled && !prevFilled.current) {
      popScale.value = withSequence(withSpring(1.16, spring.pop), withSpring(1, spring.pressOut));
    }
    prevFilled.current = filled;
  }, [filled, popScale]);

  useEffect(() => {
    if (focused && !filled) {
      caret.value = withRepeat(withTiming(0.15, { duration: 420 }), -1, true);
    } else {
      caret.value = 1;
    }
    return () => {
      caret.value = 1;
    };
  }, [focused, filled, caret]);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      filled ? [colors.brandSoft, colors.brand] : [colors.border, colors.brandDeep]
    ) ?? (filled ? colors.brandSoft : colors.border),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      filled ? [colors.brandSoft + 'CC', colors.brandSoft] : [colors.card, colors.card]
    ),
    shadowOpacity: 0.06 + focus.value * 0.24,
    shadowRadius: 4 + focus.value * 5,
    shadowColor: colors.brand,
    transform: [{ scale: popScale.value }],
  }));

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  return (
    <Animated.View style={[styles.box, boxStyle]}>
      <TextInput
        ref={ref}
        style={[styles.input]}
        value={digit === ' ' ? '' : digit}
        onChangeText={t => onSetDigit(index, t)}
        onFocus={onFocus}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
            onFocusPrev();
          }
        }}
        maxLength={1}
        textAlign="center"
      />
      {focused && !filled && (
        <Animated.View pointerEvents="none" style={[styles.caret, caretStyle]} />
      )}
    </Animated.View>
  );
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  box: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    paddingVertical: 0,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.dark,
    textAlign: 'center',
  },
  caret: {
    position: 'absolute',
    bottom: 8,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.brandDeep,
  },
});

export default OtpBoxes;