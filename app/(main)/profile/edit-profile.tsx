import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import AppButton from '../../../src/components/AppButton';
import FormField from '../../../src/components/FormField';
import IconButton from '../../../src/components/IconButton';
import { Entrance } from '../../../src/components/Motion';
import { authApi } from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { useLanguage } from '../../../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../../../src/theme';

type FormValues = {
  name: string;
  email: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { user, token, updateUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = React.useState(false);

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const onSubmit = handleSubmit(async ({ name, email }) => {
    setLoading(true);
    try {
      const res = await authApi.updateProfile(token!, {
        name: name.trim(),
        email: email.trim() || null,
      });
      updateUser(res.user);
      Alert.alert(t.alertSuccess, t.profileSaved);
      router.back();
    } catch (e: any) {
      const fields = e?.fieldErrors
        ? Object.values(e.fieldErrors).flat().join('\n')
        : null;
      Alert.alert(t.alertWarning, fields ?? e?.message ?? t.alertErrorGeneric);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Entrance direction="down" distance={14}>
        <View style={styles.headerRow}>
          <IconButton
            icon={isRTL ? 'chevron-back' : 'chevron-forward'}
            variant="light"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
          />
          <Text style={styles.headerTitle}>{t.editProfileTitle}</Text>
          <View style={{ width: 38 }} />
        </View>
      </Entrance>

      <Entrance delay={140}>
        <View style={styles.form}>
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
            name="email"
            label={t.profileEmail}
            placeholder={t.profileEmail}
            icon="mail-outline"
            keyboardType="email-address"
            rules={{
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t.alertEmailInvalid,
              },
            }}
          />
          <AppButton title={t.saveBtn} onPress={onSubmit} loading={loading} />
        </View>
      </Entrance>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.dark,
  },
  form: {
    padding: 20,
    gap: 8,
  },
});