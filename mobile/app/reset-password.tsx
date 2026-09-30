import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import AuthBackdrop from '../src/components/AuthBackdrop';
import { Entrance } from '../src/components/Motion';
import { authApi } from '../src/api/endpoints';
import { useLanguage } from '../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../src/theme';

type FormValues = { password: string; confirm: string };

export default function ResetPassword() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();
  const phone = (params.phone ?? '').toString();
  const code = (params.code ?? '').toString();

  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ password, confirm }) => {
    setLoading(true);
    try {
      await authApi.resetPassword(phone, code, password, confirm);
      Alert.alert(t.alertSuccess, t.alertPasswordChanged, [
        { text: t.alertOk, onPress: () => router.dismissAll() },
      ]);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertResetError);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <AuthBackdrop />
      <Entrance delay={40} distance={12}>
        <View style={styles.logoRow}>
          <Logo width={110} variant="dark" />
        </View>
      </Entrance>

      <Entrance delay={110}>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t.resetTitle}</Text>
      </Entrance>
      <Entrance delay={160}>
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.resetSubtitle}</Text>
      </Entrance>

      <Entrance delay={220}>
        <View style={styles.form}>
          <FormField
            control={control}
            name="password"
            placeholder={t.passwordPlaceholder}
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
            placeholder={t.confirmPasswordPlaceholder}
            icon="lock-closed-outline"
            secure
            rules={{
              required: t.alertConfirmRequired,
              validate: (v: string, f: FormValues) =>
                v === f.password || t.alertPasswordMismatch,
            }}
          />
          <AppButton title={t.resetBtn} onPress={onSubmit} loading={loading} style={{ marginTop: 10 }} />
        </View>
      </Entrance>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 28,
  },
  logoRow: {
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 30,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 26,
  },
  form: {
    width: '100%',
    gap: 6,
  },
});
