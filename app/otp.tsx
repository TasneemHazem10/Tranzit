import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import OtpBoxes from '../src/components/OtpBoxes';
import AuthBackdrop from '../src/components/AuthBackdrop';
import { Entrance } from '../src/components/Motion';
import { authApi } from '../src/api/endpoints';
import { useAuth } from '../src/store/auth';
import { useLanguage } from '../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../src/theme';

const RESEND_SECONDS = 45;

export default function Otp() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ phone?: string; purpose?: string; code?: string }>();
  const phone = (params.phone ?? '').toString();
  const purpose = (params.purpose ?? 'login').toString();
  const debugCode = (params.code ?? '').toString();

  const { signIn } = useAuth();
  const { t, isRTL } = useLanguage();
  const [code, setCode] = useState(debugCode);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const maskedPhone = phone.length >= 4 ? `${phone.slice(0, -3)}***` : phone;

  const verify = async () => {
    if (code.replace(/\s/g, '').length !== 4) {
      Alert.alert(t.alertWarning, t.alertCodeEmpty);
      return;
    }
    setLoading(true);
    try {
      if (purpose === 'reset') {
        router.push({
          pathname: '/reset-password',
          params: { phone, code: code.replace(/\s/g, '') },
        });
        return;
      }

      const res = await authApi.verifyOtp(phone, code.replace(/\s/g, ''), purpose);
      await signIn(res.token, res.user);
      router.dismissAll();
      router.replace('/(main)');
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertOtpVerifyError);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const res = await authApi.resendOtp(phone, purpose);
      if (res.debug_code) {
        setSeconds(RESEND_SECONDS);
        setCode(res.debug_code);
      }
      Alert.alert(t.alertSuccess, t.alertOtpResent);
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertResendFailed);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AuthBackdrop />
      <Entrance delay={40} distance={12}>
        <View style={styles.logoRow}>
          <Logo width={110} variant="dark" />
        </View>
      </Entrance>

      <Entrance delay={110}>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t.otpTitle}</Text>
      </Entrance>
      <Entrance delay={160}>
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t.otpSubtitle1}{' '}
          <Text style={styles.phone}>{maskedPhone}</Text>
        </Text>
      </Entrance>

      {debugCode ? (
        <Entrance delay={200} distance={0}>
          <View style={styles.devBanner}>
            <Text style={styles.devBannerText}>
              {t.devCodeLabel} {debugCode}
            </Text>
          </View>
        </Entrance>
      ) : null}

      <Entrance delay={260}>
        <OtpBoxes value={code} onChange={setCode} />
      </Entrance>

      <Entrance delay={320} distance={0}>
        {seconds > 0 ? (
          <Text style={styles.countdown}>
            {t.resendAfter}{seconds.toString().padStart(2, '0')}
          </Text>
        ) : (
          <Text onPress={resend} style={styles.resend}>
            {resending ? t.sending : t.resendCode}
          </Text>
        )}
      </Entrance>

      <View style={{ flex: 1 }} />

      <Entrance delay={380}>
        <AppButton title={t.confirmCode} onPress={verify} loading={loading} style={styles.cta} />
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
    marginTop: 24,
    marginBottom: 34,
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
    lineHeight: 24,
    marginTop: 6,
  },
  phone: {
    fontFamily: fonts.bold,
    color: colors.dark,
  },
  devBanner: {
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  devBannerText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textGray,
    letterSpacing: 1,
  },
  countdown: {
    alignSelf: 'center',
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textGray,
  },
  resend: {
    alignSelf: 'center',
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.dark,
    textDecorationLine: 'underline',
  },
  cta: {
    marginBottom: 30,
  },
});
