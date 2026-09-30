import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import AuthBackdrop from '../src/components/AuthBackdrop';
import { Entrance } from '../src/components/Motion';
import { authApi } from '../src/api/endpoints';
import { useLanguage } from '../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../src/theme';

type FormValues = { phone: string };

export default function ForgotPassword() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = React.useState(false);
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { phone: '' } });

  const onSubmit = handleSubmit(async ({ phone }) => {
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(phone.trim());
      router.push({
        pathname: '/otp',
        params: {
          phone: phone.trim(),
          purpose: 'reset',
          ...(res.debug_code ? { code: res.debug_code } : {}),
        },
      });
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertForgotError);
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
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t.forgotTitle}</Text>
      </Entrance>
      <Entrance delay={160}>
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t.forgotSubtitle}
        </Text>
      </Entrance>

      <Entrance delay={220}>
        <View style={styles.form}>
          <FormField
            control={control}
            name="phone"
            placeholder={t.phoneMobilePlaceholder}
            icon="call-outline"
            keyboardType="phone-pad"
            rules={{
              required: t.alertPhoneRequiredSignup,
              pattern: { value: /^[0-9+\s-]{8,15}$/, message: t.alertPhoneInvalidSignup },
            }}
          />
          <AppButton title={t.forgotBtn} onPress={onSubmit} loading={loading} style={{ marginTop: 10 }} />
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
    marginBottom: 34,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 25,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 6,
    marginBottom: 30,
  },
  form: {
    width: '100%',
    gap: 6,
  },
});
