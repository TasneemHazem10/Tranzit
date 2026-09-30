import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AuthBackdrop from '../src/components/AuthBackdrop';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import DividerRow from '../src/components/DividerRow';
import GoogleButton from '../src/components/GoogleButton';
import { Entrance } from '../src/components/Motion';
import { authApi } from '../src/api/endpoints';
import { useAuth } from '../src/store/auth';
import { useGoogleAuth } from '../src/hooks/useGoogleAuth';
import { useLanguage } from '../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../src/theme';

type FormValues = {
  phone: string;
  password: string;
};

export default function Login() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t, isRTL } = useLanguage();
  const { signIn } = useAuth();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ phone, password }) => {
    setLoading(true);
    try {
      const res = await authApi.login(phone.trim(), password);
      Alert.alert(t.alertSuccess, t.alertOtpSent);
      router.push({
        pathname: '/otp',
        params: {
          phone: phone.trim(),
          purpose: 'login',
          ...(res.debug_code ? { code: res.debug_code } : {}),
        },
      });
    } catch (e: any) {
      const fields = e?.fieldErrors
        ? Object.values(e.fieldErrors).flat().join('\n')
        : null;
      Alert.alert(t.alertWarning, fields ?? e?.message ?? t.alertErrorGeneric);
    } finally {
      setLoading(false);
    }
  });

  const onGoogle = async () => {
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return;

      const res = await authApi.googleLogin(idToken);
      await signIn(res.token, res.user);
      Alert.alert(t.alertSuccess, res.message);
      router.replace('/(main)');
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertGoogleLoginFail);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AuthBackdrop />

      <View style={styles.scroll}>
        <Entrance delay={40}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Logo width={110} variant="white" />
            </View>
          </View>
        </Entrance>

        <Entrance delay={120}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t.loginTitle}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.loginSubtitle}</Text>
        </Entrance>

        <Entrance delay={190} style={styles.form}>
          <FormField
            control={control}
            name="phone"
            label={t.phonePlaceholder}
            placeholder={t.phonePlaceholder}
            icon="call-outline"
            keyboardType="phone-pad"
            rules={{
              required: t.alertPhoneRequired,
              pattern: { value: /^[0-9+\s-]{8,15}$/, message: t.alertPhoneInvalid },
            }}
          />
          <FormField
            control={control}
            name="password"
            label={t.passwordPlaceholder}
            placeholder={t.passwordPlaceholder}
            icon="lock-closed-outline"
            secure
            rules={{
              required: t.alertPasswordRequired,
              minLength: { value: 6, message: t.alertPasswordMin },
            }}
          />

          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text
              style={StyleSheet.flatten([styles.forgot, { textAlign: isRTL ? 'right' : 'left' }])}>
              {t.forgotPassword}
            </Text>
          </Pressable>

          <AppButton title={t.loginBtn} onPress={onSubmit} loading={loading} />

          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.footerText}>{t.noAccount}</Text>
            <Pressable onPress={() => router.push('/signup')}>
              <Text style={styles.footerLink}>{t.createAccount}</Text>
            </Pressable>
          </View>

          <DividerRow />
          <GoogleButton disabled={googleLoading} onPress={onGoogle} />
        </Entrance>
      </View>
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
  scroll: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoBadge: {
    backgroundColor: colors.brand,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.dark,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  form: {
    width: '100%',
    gap: 8,
  },
  forgot: {
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    color: colors.textGray,
    textDecorationLine: 'underline',
    marginVertical: 2,
  },
  footer: {
    justifyContent: 'center',
    marginTop: 12,
  },
  footerText: {
    fontFamily: fonts.medium,
    color: colors.textGray,
    fontSize: 14,
  },
  footerLink: {
    fontFamily: fonts.bold,
    color: colors.dark,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});