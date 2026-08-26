import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Control,
  Controller,
  FieldError,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../theme';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  placeholder: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  rules?: RegisterOptions<T, FieldPath<T>>;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
};

export default function FormField<T extends FieldValues>({
  control,
  name,
  placeholder,
  icon,
  secure,
  rules,
  keyboardType = 'default',
}: Props<T>) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.divider, colors.dark],
  });

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur: fieldOnBlur, value }, fieldState: { error } }) => (
        <View>
          <Animated.View
            style={[
              styles.wrap,
              error && { borderColor: colors.red, borderWidth: 1.5 },
              !error && { borderColor, borderWidth: focused ? 1.5 : 1 },
            ]}>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color={focused ? colors.dark : colors.textGray}
                style={styles.icon}
              />
            )}
            <TextInput
              style={[styles.input, icon && { flex: 1 }]}
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
                color={focused ? colors.dark : colors.textGray}
                onPress={() => setHidden(v => !v)}
              />
            )}
          </Animated.View>
          {!!error && <Text style={styles.error}>{(error as FieldError).message}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 4,
  },
  icon: { marginLeft: 10 },
  input: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.dark,
    paddingVertical: 0,
  },
  error: {
    color: colors.red,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
    textAlign: 'right',
  },
});
