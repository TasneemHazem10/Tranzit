import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import AppButton from '../../../src/components/AppButton';
import FormField from '../../../src/components/FormField';
import IconButton from '../../../src/components/IconButton';
import { Entrance } from '../../../src/components/Motion';
import { authApi } from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { useLanguage } from '../../../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../../../src/theme';

type FormValues = {
  current: string;
  next: string;
  confirm: string;
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { token, signOut } = useAuth();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = React.useState(false);

  const { control, getValues, handleSubmit } = useForm<FormValues>({
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ current, next, confirm }) => {
    setLoading(true);
    try {
      await authApi.changePassword(token!, {
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      Alert.alert(t.alertSuccess, t.passwordChanged);
      await signOut();
      router.replace('/login');
    } catch (e: any) {
      const msg = e?.status === 422 ? t.profileCurrentPasswordWrong : (e?.message ?? t.alertErrorGeneric);
      Alert.alert(t.alertWarning, msg);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Entrance direction="down" distance={14}>
        <View style={styles.headerRow}>
          <IconButton
            icon={isRTL ? 'chevron-back' : 'chevron-forward'}
            variant="light"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
          />
          <Text style={styles.headerTitle}>{t.changePasswordTitle}</Text>
          <View style={{ width: 38 }} />
        </View>
      </Entrance>

      <Entrance delay={140}>
        <View style={styles.form}>
          <FormField
            control={control}
            name="current"
            label={t.currentPasswordPlaceholder}
            placeholder={t.currentPasswordPlaceholder}
            icon="lock-closed-outline"
            secure
            rules={{ required: t.alertPasswordRequired }}
          />
          <FormField
            control={control}
            name="next"
            label={t.newPasswordPlaceholder}
            placeholder={t.newPasswordPlaceholder}
            icon="lock-closed-outline"
            secure
            rules={{
              required: t.alertPasswordRequired,
              minLength: { value: 6, message: t.alertPasswordMin },
            }}
          />
          <FormField
            control={control}
            name="confirm"
            label={t.confirmNewPasswordPlaceholder}
            placeholder={t.confirmNewPasswordPlaceholder}
            icon="lock-closed-outline"
            secure
            rules={{
              required: t.alertConfirmRequired,
              validate: (v: string) => v === getValues('next') || t.alertPasswordMismatch,
            }}
          />
          <AppButton title={t.saveBtn} onPress={onSubmit} loading={loading} />
        </View>
      </Entrance>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.dark,
  },
  form: {
    padding: 20,
    gap: 8,
  },
});