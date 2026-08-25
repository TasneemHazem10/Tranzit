import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import GradientBackdrop, { GradientColors } from '../src/components/GradientBackdrop';
import { authApi } from '../src/api/endpoints';
import { colors, fonts } from '../src/theme';

type FormValues = { password: string; confirm: string };

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();
  const phone = (params.phone ?? '').toString();
  const code = (params.code ?? '').toString();

  const [loading, setLoading] = React.useState(false);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ password, confirm }) => {
    setLoading(true);
    try {
      await authApi.resetPassword(phone, code, password, confirm);
      Alert.alert('تم', 'تم تغيير كلمة المرور، سجل دخولك الآن.', [
        { text: 'حسناً', onPress: () => router.dismissAll() },
      ]);
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('تنبيه', e?.message ?? 'حدث خطأ، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackdrop from={GradientColors.blue} />
      <View style={styles.logoRow}>
        <Logo width={110} variant="dark" />
      </View>

      <Text style={styles.title}>أنشئ حسابك في ترانزيت</Text>
      <Text style={styles.subtitle}>اختر كلمة مرور جديدة لحسابك</Text>

      <View style={styles.form}>
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
        <AppButton title="التالي" onPress={onSubmit} loading={loading} style={{ marginTop: 10 }} />
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
