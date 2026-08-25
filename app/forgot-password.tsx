import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import FormField from '../src/components/FormField';
import GradientBackdrop, { GradientColors } from '../src/components/GradientBackdrop';
import { authApi } from '../src/api/endpoints';
import { colors, fonts } from '../src/theme';

type FormValues = { phone: string };

export default function ForgotPassword() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { phone: '' } });

  const onSubmit = handleSubmit(async ({ phone }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(phone.trim());
      router.push({
        pathname: '/otp',
        params: { phone: phone.trim(), purpose: 'reset' },
      });
    } catch (e: any) {
      Alert.alert('تنبيه', e?.message ?? 'حدث خطأ، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackdrop from={GradientColors.peach} />
      <View style={styles.logoRow}>
        <Logo width={110} variant="dark" />
      </View>

      <Text style={styles.title}>نسيت كلمة المرور</Text>
      <Text style={styles.subtitle}>
        ما تقلقش، هستعدك ترجع حسابك في خطوات بسيطة.
      </Text>

      <View style={styles.form}>
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
