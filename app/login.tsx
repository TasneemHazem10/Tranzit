import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import DividerRow from '../src/components/DividerRow';
import GoogleButton from '../src/components/GoogleButton';
import { authApi, type OtpResponse } from '../src/api/endpoints';
import { colors, fonts } from '../src/theme';

type FormValues = { phone: string; password: string };

export default function Login() {
  const router = useRouter();
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { phone: '', password: '' },
  });
  const [loading, setLoading] = React.useState(false);

  const onSubmit = handleSubmit(async ({ phone, password }) => {
    setLoading(true);
    try {
      const res = await authApi.login(phone.trim(), password);
      const debugMsg = res.debug_code ? `\n\nكود التحقق: ${res.debug_code}` : '';
      Alert.alert('تم', `تم إرسال كود التحقق إلى رقمك.${debugMsg}`);
      router.push({ pathname: '/otp', params: { phone: phone.trim(), purpose: 'login' } });
    } catch (e: any) {
      const fields = e?.fieldErrors
        ? Object.values(e.fieldErrors).flat().join('\n')
        : null;
      Alert.alert('تنبيه', fields ?? e?.message ?? 'حدث خطأ، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  });

  const onGoogle = () => {
    Alert.alert(
      'تسجيل جوجل',
      'لتشغيل تسجيل الدخول بجوجل تحتاج:\n1) إنشاء OAuth Client ID من Google Cloud Console\n2) إضافته في backend/.env باسم GOOGLE_CLIENT_ID\n3) بناء نسخة تطوير (dev build) مع مكتبة google-signin'
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#DDE7EE', '#FFFFFF00']}
        locations={[0, 0.35]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.logoRow}>
        <Logo width={120} variant="dark" />
      </View>

      <Text style={styles.title}>تسجيل دخول</Text>
      <Text style={styles.subtitle}>سجل دخولك الآن وابدأ رحلتك</Text>

      <View style={styles.form}>
        <FormField
          control={control}
          name="phone"
          placeholder="رقم الهاتف"
          icon="call-outline"
          keyboardType="phone-pad"
          rules={{
            required: 'أدخل رقم الهاتف',
            pattern: { value: /^[0-9+\s-]{8,15}$/, message: 'رقم هاتف غير صالح' },
          }}
        />
        <FormField
          control={control}
          name="password"
          placeholder="كلمة المرور"
          icon="lock-closed-outline"
          secure
          rules={{ required: 'أدخل كلمة المرور' }}
        />

        <Link href="/forgot-password" asChild>
          <Text style={styles.forgot}>نسيت كلمة المرور؟</Text>
        </Link>

        <AppButton title="تسجيل دخول" onPress={onSubmit} loading={loading} />
        <DividerRow />
        <GoogleButton onPress={onGoogle} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>ليس لديك حساب؟ </Text>
          <Link href="/signup" asChild>
            <Text style={styles.footerLink}>إنشاء حساب</Text>
          </Link>
        </View>
      </View>
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
    marginTop: 26,
    marginBottom: 30,
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
    marginBottom: 26,
  },
  form: {
    width: '100%',
    gap: 8,
  },
  forgot: {
    alignSelf: 'flex-start',
    color: colors.textGray,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    marginVertical: 6,
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginTop: 22,
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
