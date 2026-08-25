import React, { useState } from 'react';
import {
  Control,
  Controller,
  FieldError,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
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

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View>
          <View
            style={[
              styles.wrap,
              error && { borderWidth: 1.5, borderColor: colors.red },
            ]}>
            {icon && (
              <Ionicons name={icon} size={20} color={colors.textGray} style={styles.icon} />
            )}
            <TextInput
              style={[styles.input, icon && { flex: 1 }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textLight}
              onChangeText={onChange}
              onBlur={onBlur}
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
                color={colors.textGray}
                onPress={() => setHidden(v => !v)}
              />
            )}
          </View>
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
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 6,
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
