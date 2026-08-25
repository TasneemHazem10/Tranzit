import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import { request } from '../../../src/api/client';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

const STEPS = ['المعلومات الشخصية', 'المستندات الشخصية', 'معلومات المركبة', 'مستندات المركبة'];

const VEHICLE_TYPES = ['شاحنة صغيرة', 'شاحنة متوسطة', 'شاحنة كبيرة', 'دراجة نارية', 'سيارة'];

export default function DriverRegisterScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 - Personal
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');

  // Step 3 - Vehicle
  const [vehicleType, setVehicleType] = useState('شاحنة صغيرة');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');

  const canNext = () => {
    if (step === 0) return name.trim() && phone.trim() && nationalId.trim();
    if (step === 1) return true; // docs optional for now
    if (step === 2) return vehicleModel.trim() && vehicleYear.trim() && vehiclePlate.trim();
    return true;
  };

  const submit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('national_id', nationalId);
      formData.append('vehicle_type', vehicleType);
      formData.append('vehicle_model', vehicleModel);
      formData.append('vehicle_year', vehicleYear);
      formData.append('vehicle_plate', vehiclePlate);
      if (vehicleCapacity) formData.append('vehicle_capacity', vehicleCapacity);

      await request('/api/v1/driver/register', { method: 'POST', formData });
      Alert.alert('تم الإرسال', 'تم إرسال بياناتك بنجاح، في انتظار المراجعة من الإدارة.', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const fields = e?.fieldErrors ? Object.values(e.fieldErrors).flat().join('\n') : null;
      Alert.alert('تنبيه', fields ?? e?.message ?? 'تعذر التسجيل.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.dark} />
        </Pressable>
        <Text style={styles.headerTitle}>تسجيل سائق</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Step indicators */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              {i < step ? (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              ) : (
                <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
              )}
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Text style={styles.fieldLabel}>الاسم الكامل</Text>
              <TextInput style={styles.input} placeholder="أدخل اسمك" placeholderTextColor={colors.textLight} value={name} onChangeText={setName} textAlign="right" />

              <Text style={styles.fieldLabel}>رقم الجوال</Text>
              <TextInput style={styles.input} placeholder="05XXXXXXXX" placeholderTextColor={colors.textLight} keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" />

              <Text style={styles.fieldLabel}>رقم الهوية الوطنية</Text>
              <TextInput style={styles.input} placeholder="أدخل رقم الهوية" placeholderTextColor={colors.textLight} keyboardType="numeric" value={nationalId} onChangeText={setNationalId} textAlign="right" />
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.fieldLabel}>صورة شخصية</Text>
              <UploadField label="ارفع صورتك الشخصية" />

              <Text style={styles.fieldLabel}>صورة الهوية الوطنية</Text>
              <UploadField label="ارفع صورة الهوية" />

              <Text style={styles.fieldLabel}>رخصة القيادة</Text>
              <UploadField label="ارفع صورة الرخصة" />

              <Text style={styles.fieldLabel}>التأمين (اختياري)</Text>
              <UploadField label="ارفع صورة التأمين" />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.fieldLabel}>نوع المركبة</Text>
              <View style={styles.chipRow}>
                {VEHICLE_TYPES.map(v => (
                  <Pressable key={v} style={[styles.chip, vehicleType === v && styles.chipActive]} onPress={() => setVehicleType(v)}>
                    <Text style={[styles.chipText, vehicleType === v && styles.chipTextActive]}>{v}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>طراز المركبة</Text>
              <TextInput style={styles.input} placeholder="مثال: هايس" placeholderTextColor={colors.textLight} value={vehicleModel} onChangeText={setVehicleModel} textAlign="right" />

              <Text style={styles.fieldLabel}>سنة الصنع</Text>
              <TextInput style={styles.input} placeholder="2024" placeholderTextColor={colors.textLight} keyboardType="numeric" maxLength={4} value={vehicleYear} onChangeText={setVehicleYear} textAlign="right" />

              <Text style={styles.fieldLabel}>رقم اللوحة</Text>
              <TextInput style={styles.input} placeholder="أدخل رقم اللوحة" placeholderTextColor={colors.textLight} value={vehiclePlate} onChangeText={setVehiclePlate} textAlign="right" />

              <Text style={styles.fieldLabel}>الحمولة (اختياري)</Text>
              <TextInput style={styles.input} placeholder="مثال: 1 طن" placeholderTextColor={colors.textLight} value={vehicleCapacity} onChangeText={setVehicleCapacity} textAlign="right" />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.fieldLabel}>رخصة المركبة</Text>
              <UploadField label="ارفع صورة رخصة المركبة" />

              <Text style={styles.fieldLabel}>تأمين المركبة</Text>
              <UploadField label="ارفع صورة تأمين المركبة" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBtn}>
        {step < 3 ? (
          <AppButton title="التالي" onPress={() => setStep(step + 1)} disabled={!canNext()} />
        ) : (
          <AppButton title="إرسال التسجيل" onPress={submit} loading={loading} />
        )}
      </View>
    </SafeAreaView>
  );
}

function UploadField({ label }: { label: string }) {
  const [uploaded, setUploaded] = useState(false);
  return (
    <Pressable
      style={[styles.uploadBox, uploaded && styles.uploadedBox]}
      onPress={() => setUploaded(!uploaded)}>
      <Ionicons name={uploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={28} color={uploaded ? colors.green : colors.textLight} />
      <Text style={[styles.uploadText, uploaded && styles.uploadedText]}>{uploaded ? 'تم الرفع ✓' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.divider,
  },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.dark },
  stepsRow: {
    flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stepDotActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  stepNum: { fontFamily: fonts.bold, fontSize: 12, color: colors.textLight },
  stepNumActive: { color: colors.white },
  stepLine: { height: 2, flex: 1, backgroundColor: colors.border, marginTop: -14 },
  stepLineActive: { backgroundColor: colors.dark },
  stepLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.dark, textAlign: 'center', marginTop: 12 },
  body: { padding: 24, paddingBottom: 40 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.dark, textAlign: 'right', marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    height: 50, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 14, color: colors.dark,
  },
  chipRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.dark },
  chipTextActive: { color: colors.white },
  uploadBox: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: radius.md, padding: 16, minHeight: 56,
  },
  uploadedBox: { borderColor: colors.green, backgroundColor: colors.green + '08', borderStyle: 'solid' },
  uploadText: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.textLight, textAlign: 'right', flex: 1 },
  uploadedText: { color: colors.green },
  bottomBtn: { paddingHorizontal: 24, paddingBottom: 20 },
});
