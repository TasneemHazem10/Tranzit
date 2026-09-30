import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { fonts, colors as themeColors, useTheme, type ThemeColors } from '../src/theme';

type FormValues = {
  name: string;
  phone: string;
  password: string;
  confirm: string;
};

export default function Signup() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { signIn } = useAuth();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  const { t, isRTL } = useLanguage();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [accepted, setAccepted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit, trigger } = useForm<FormValues>({
    defaultValues: { name: '', phone: '', password: '', confirm: '' },
  });

  const nextStep = async () => {
    if (step === 1) {
      const ok = await trigger(['name', 'phone']);
      if (ok) setStep(2);
    }
  };

  const onSubmit = handleSubmit(async ({ name, phone, password, confirm }) => {
    if (!accepted) {
      Alert.alert(t.alertWarning, t.alertTermsRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(name.trim(), phone.trim(), password, confirm);
      Alert.alert(t.alertSuccess, t.otpSubtitle1);
      router.push({
        pathname: '/otp',
        params: {
          phone: phone.trim(),
          purpose: 'register',
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

  const steps = [t.signupStep1, t.signupStep2];

  return (
    <SafeAreaView style={styles.safe}>
      <AuthBackdrop />
      <Entrance delay={40}>
        <View style={styles.logoRow}>
          <Logo width={110} variant="dark" />
        </View>
      </Entrance>

      <Entrance delay={120}>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{t.signupTitle}</Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t.signupSubtitle}</Text>
      </Entrance>

      <Entrance delay={170} style={styles.steps}>
        {steps.map((label, i) => {
          const num = i + 1;
          const active = step === num;
          const done = step > num;
          return (
            <View key={label} style={styles.stepItem}>
              <Pressable
                onPress={() => (done ? setStep(num as 1 | 2) : null)}
                style={[styles.stepChip, active && styles.stepChipActive, done && styles.stepChipDone]}>
                {done ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : (
                  <Text style={[styles.stepNum, active && styles.stepNumActive]}>{num}</Text>
                )}
              </Pressable>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive, { textAlign: 'center' }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </Entrance>

      <Entrance delay={220} style={styles.form}>
        {step === 1 ? (
          <>
            <FormField
              control={control}
              name="name"
              label={t.namePlaceholder}
              placeholder={t.namePlaceholder}
              icon="person-outline"
              rules={{ required: t.alertNameRequired, minLength: { value: 3, message: t.alertNameShort } }}
            />
            <FormField
              control={control}
              name="phone"
              label={t.phoneMobilePlaceholder}
              placeholder={t.phoneMobilePlaceholder}
              icon="call-outline"
              keyboardType="phone-pad"
              rules={{
                required: t.alertPhoneRequiredSignup,
                pattern: { value: /^[0-9+\s-]{8,15}$/, message: t.alertPhoneInvalidSignup },
              }}
            />
            <AppButton title={t.signupNext} onPress={nextStep} />
          </>
        ) : (
          <>
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
            <FormField
              control={control}
              name="confirm"
              label={t.confirmPasswordPlaceholder}
              placeholder={t.confirmPasswordPlaceholder}
              icon="lock-closed-outline"
              secure
              rules={{
                required: t.alertConfirmRequired,
                validate: (v: string, f: FormValues) =>
                  v === f.password || t.alertPasswordMismatch,
              }}
            />

            <View style={[styles.terms, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable
                onPress={() => setAccepted(v => !v)}
                hitSlop={8}
                style={[styles.checkbox, accepted && styles.checkboxOn]}>
                {accepted && <Text style={styles.check}>✓</Text>}
              </Pressable>
              <View style={styles.termsTextWrap}>
                <Pressable onPress={() => setAccepted(v => !v)} hitSlop={6}>
                  <Text style={styles.termsText}>{t.termsAgree}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/terms')}
                  hitSlop={6}
                  style={[styles.termsLinkRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="document-text-outline" size={13} color={colors.brand} />
                  <Text style={styles.termsLink}>{t.termsRead}</Text>
                </Pressable>
              </View>
            </View>

            <AppButton title={t.signupBtn} onPress={onSubmit} loading={loading} />

            <Pressable onPress={() => setStep(1)} style={styles.backRow}>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={16}
                color={colors.textGray}
              />
              <Text style={styles.backText}>{t.signupBack}</Text>
            </Pressable>
          </>
        )}

        <DividerRow />
        <GoogleButton
          disabled={googleLoading}
          onPress={async () => {
            try {
              const idToken = await signInWithGoogle();
              if (!idToken) return;
              const res = await authApi.googleLogin(idToken);
              await signIn(res.token, res.user);
              Alert.alert(t.alertSuccess, res.message);
              router.replace('/(main)');
            } catch (e: any) {
              Alert.alert(t.alertWarning, e?.message ?? t.alertGoogleSignupFail);
            }
          }}
        />

        <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.footerText}>{t.hasAccount}</Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.footerLink}>{t.loginLink}</Text>
          </Pressable>
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
    marginTop: 20,
    marginBottom: 20,
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
    marginBottom: 18,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepChipActive: {
    borderColor: colors.dark,
    backgroundColor: themeColors.dark,
  },
  stepChipDone: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  stepNum: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textGray,
  },
  stepNumActive: {
    color: colors.white,
  },
  stepCheck: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  stepLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textGray,
  },
  stepLabelActive: {
    fontFamily: fonts.bold,
    color: colors.dark,
  },
  form: {
    width: '100%',
    gap: 8,
  },
  terms: {
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 4,
  },
  termsTextWrap: {
    flex: 1,
    gap: 3,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: themeColors.dark,
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
  termsLinkRow: {
    alignItems: 'center',
    gap: 5,
  },
  termsLink: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.brand,
    textDecorationLine: 'underline',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backText: {
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    color: colors.textGray,
  },
  footer: {
    justifyContent: 'center',
    marginTop: 14,
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