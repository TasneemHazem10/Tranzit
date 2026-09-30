import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Control,
  FieldError,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useController,
} from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import ShakeView, { type ShakeHandle } from './motion/ShakeView';
import { useLanguage } from '../store/language';
import { useReducedMotion } from '../hooks/useMotion';
import { fonts, radius, useTheme, type ThemeColors } from '../theme';
import { spring } from './motion/presets';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  placeholder: string;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  rules?: RegisterOptions<T, FieldPath<T>>;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
};

export default function FormField<T extends FieldValues>({
  control,
  name,
  placeholder,
  label,
  icon,
  secure,
  rules,
  keyboardType = 'default',
}: Props<T>) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { isRTL } = useLanguage();
  const reduced = useReducedMotion();
  const {
    field: { onChange, onBlur: fieldOnBlur, value },
    fieldState: { error },
  } = useController<T, FieldPath<T>>({ control, name, rules });

  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const shakeRef = useRef<ShakeHandle | null>(null);
  const hadError = useRef(false);

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const has = !!error;

  const onFocus = () => {
    setFocused(true);
    focus.value = withSpring(1, spring.toggle);
  };
  const onBlur = () => {
    setFocused(false);
    focus.value = withSpring(0, spring.toggle);
  };

  useEffect(() => {
    if (has && !hadError.current && !reduced) {
      shakeRef.current?.shake();
    }
    hadError.current = has;
  }, [has, reduced]);

  const wrapStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.divider, colors.brand]),
    borderWidth: 1 + focus.value * 0.5,
    shadowOpacity: focus.value * 0.14,
    shadowRadius: focus.value * 8,
    shadowColor: colors.brand,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focus.value * 0.18 }],
  }));

  return (
    <View style={styles.fieldWrap}>
      {label && <Text style={[styles.label, { textAlign }]}>{label}</Text>}
      <ShakeView ref={shakeRef} amplitude={9}>
        <Animated.View
          style={[
            styles.wrap,
            { flexDirection: rowDir },
            wrapStyle,
            error && styles.wrapError,
          ]}>
          {icon && (
            <Animated.View style={iconStyle}>
              <Ionicons
                name={icon}
                size={20}
                color={focused ? colors.brand : colors.textGray}
                style={styles.icon}
              />
            </Animated.View>
          )}
          <TextInput
            style={[styles.input, { textAlign }, icon && { flex: 1 }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            onChangeText={onChange}
            onBlur={() => {
              fieldOnBlur();
              onBlur();
            }}
            onFocus={onFocus}
            value={(value as string | undefined) ?? ''}
            secureTextEntry={hidden}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoComplete="off"
          />
          {secure && (
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={focused ? colors.brand : colors.textGray}
              onPress={() => setHidden(v => !v)}
            />
          )}
        </Animated.View>
      </ShakeView>
      {!!error && <Text style={[styles.error, { textAlign }]}>{(error as FieldError).message}</Text>}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  fieldWrap: {
    marginBottom: 2,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.dark,
    marginBottom: 6,
  },
  wrap: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 4,
    borderColor: colors.divider,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 },
  },
  wrapError: {
    borderColor: colors.red,
    borderWidth: 1.5,
    shadowColor: colors.red,
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  icon: { marginEnd: 10 },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.dark,
    paddingVertical: 0,
  },
  error: {
    color: colors.red,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
});