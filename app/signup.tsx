import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import DividerRow from '../src/components/DividerRow';
import GoogleButton from '../src/components/GoogleButton';
import { authApi } from '../src/api/endpoints';
import { colors, fonts } from '../src/theme';

type FormValues = {
  name: string;
  phone: string;
  password: string;
  confirm: string;
};

export default function Signup() {
  const router = useRouter();
  const [accepted, setAccepted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { name: '', phone: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ name, phone, password, confirm }) => {
    if (!accepted) {
      Alert.alert('تنبيه', 'يجب الموافقة على الشروط والأحكام أولاً.');
      return;
    }
    setLoading(true);
    try {
      await authApi.register(name.trim(), phone.trim(), password, confirm);
      router.push({
        pathname: '/otp',
        params: { phone: phone.trim(), purpose: 'register' },
      });
    } catch (e: any) {
      const fields = e?.fieldErrors
        ? Object.values(e.fieldErrors).flat().join('\n')
        : null;
      Alert.alert('تنبيه', fields ?? e?.message ?? 'حدث خطأ، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#E8D9E8', '#FFFFFF00']}
        locations={[0, 0.3]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.logoRow}>
        <Logo width={120} variant="dark" />
      </View>

      <Text style={styles.title}>أنشئ حسابك في ترانزيت</Text>
      <Text style={styles.subtitle}>خطوة واحدة تفصلك عن طلب شحنتك</Text>

      <View style={styles.form}>
        <FormField
          control={control}
          name="name"
          placeholder="الاسم"
          icon="person-outline"
          rules={{ required: 'أدخل اسمك', minLength: { value: 3, message: 'الاسم قصير جداً' } }}
        />
        <FormField
          control={control}
          name="phone"
          placeholder="رقم الموبايل"
          icon="call-outline"
          keyboardType="phone-pad"
          rules={{
            required: 'أدخل رقم الموبايل',
            pattern: { value: /^[0-9+\s-]{8,15}$/, message: 'رقم غير صالح' },
          }}
        />
        <FormField
          control={control}
          name="password"
          placeholder="كلمة المرور"
          icon="lock-closed-outline"
          secure
          rules={{
            required: 'أدخل كلمة المرور',
            minLength: { value: 6, message: '6 أحرف على الأقل' },
          }}
        />
        <FormField
          control={control}
          name="confirm"
          placeholder="تأكيد كلمة المرور"
          icon="lock-closed-outline"
          secure
          rules={{
            required: 'أعد كتابة كلمة المرور',
            validate: (v: string, f: FormValues) =>
              v === f.password || 'كلمتا المرور غير متطابقتين',
          }}
        />

        <Pressable onPress={() => setAccepted(v => !v)} style={styles.terms}>
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted && <Text style={styles.check}>✓</Text>}
          </View>
          <Text style={styles.termsText}>أوافق على الشروط والأحكام</Text>
        </Pressable>

        <AppButton title="إنشاء حساب" onPress={onSubmit} loading={loading} />
        <DividerRow />
        <GoogleButton
          onPress={() =>
            Alert.alert(
              'تسجيل جوجل',
              'لتشغيل التسجيل بجوجل أضف GOOGLE_CLIENT_ID في backend/.env ثم ابنِ dev build مع مكتبة google-signin.'
            )
          }
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>لديك حساب بالفعل؟ </Text>
          <Link href="/login" asChild>
            <Text style={styles.footerLink}>تسجيل دخول</Text>
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
    marginTop: 20,
    marginBottom: 22,
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
    marginTop: 4,
    marginBottom: 20,
  },
  form: {
    width: '100%',
    gap: 8,
  },
  terms: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  check: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    marginTop: -2,
  },
  termsText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textGray,
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginTop: 18,
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
