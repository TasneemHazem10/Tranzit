import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import OtpBoxes from '../src/components/OtpBoxes';
import GradientBackdrop, { GradientColors } from '../src/components/GradientBackdrop';
import { authApi } from '../src/api/endpoints';
import { useAuth } from '../src/store/auth';
import { colors, fonts } from '../src/theme';

const RESEND_SECONDS = 45;

export default function Otp() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; purpose?: string }>();
  const phone = (params.phone ?? '').toString();
  const purpose = (params.purpose ?? 'login').toString();

  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const maskedPhone = phone.length >= 4 ? `${phone.slice(0, -3)}***` : phone;

  const verify = useCallback(async () => {
    if (code.replace(/\s/g, '').length !== 4) {
      Alert.alert('تنبيه', 'أدخل الكود المكوّن من 4 أرقام.');
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
      Alert.alert('تنبيه', e?.message ?? 'حدث خطأ، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [code, phone, purpose, router, signIn]);

  const resend = async () => {
    setResending(true);
    try {
      await authApi.resendOtp(phone, purpose);
      setSeconds(RESEND_SECONDS);
      Alert.alert('تم', 'تم إعادة إرسال الكود.');
    } catch (e: any) {
      Alert.alert('تنبيه', e?.message ?? 'تعذر إعادة الإرسال.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackdrop from={GradientColors.softGray} />
      <View style={styles.logoRow}>
        <Logo width={110} variant="dark" />
      </View>

      <Text style={styles.title}>أدخل كود التحقق</Text>
      <Text style={styles.subtitle}>
        تم إرسال كود مكوّن من 4 أرقام إلى رقم{' '}
        <Text style={styles.phone}>{maskedPhone}</Text>
      </Text>

      <OtpBoxes value={code} onChange={setCode} />

      {seconds > 0 ? (
        <Text style={styles.countdown}>
          إعادة الإرسال بعد 00:{seconds.toString().padStart(2, '0')}
        </Text>
      ) : (
        <Text onPress={resend} style={styles.resend}>
          {resending ? 'جارٍ الإرسال...' : 'إعادة إرسال الكود'}
        </Text>
      )}

      <View style={{ flex: 1 }} />

      <AppButton title="تأكيد الكود" onPress={verify} loading={loading} style={styles.cta} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
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
