import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppButton from '../../src/components/AppButton';
import LocationPicker, { type PickedPlace } from '../../src/components/LocationPicker';
import { shipmentsApi } from '../../src/api/endpoints';
import { useAuth } from '../../src/store/auth';
import { colors, fonts, radius } from '../../src/theme';

type PackageType = 'small' | 'medium' | 'large';

const PACKAGES: { key: PackageType; label: string; price: number }[] = [
  { key: 'small', label: 'صغيرة', price: 50 },
  { key: 'medium', label: 'متوسطة', price: 100 },
  { key: 'large', label: 'كبيرة', price: 180 },
];

const PAYMENTS = [
  { key: 1, label: 'أونلاين' },
  { key: 2, label: 'عند الاستلام' },
  { key: 3, label: 'محفظة إلكترونية' },
];

export default function Booking() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isLater = params.mode === 'later';

  const { token } = useAuth();
  const [pickup, setPickup] = useState<PickedPlace | null>(null);
  const [dropoff, setDropoff] = useState<PickedPlace | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'pickup' | 'dropoff' | null>(null);
  const [pkg, setPkg] = useState<PackageType>('medium');
  const [payment, setPayment] = useState(2);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 3600_000));
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedPrice = PACKAGES.find(p => p.key === pkg)!.price;

  const submit = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('تنبيه', 'حدد موقع الاستلام وموقع التسليم من الخريطة.');
      return;
    }
    setLoading(true);
    try {
      const res = await shipmentsApi.create(token!, {
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        package_type: pkg,
        payment_method: payment,
        notes: notes.trim() || null,
        scheduled_at: isLater ? date.toISOString() : null,
      });
      Alert.alert('تم الحجز ✅', `كود الشحنة: ${res.shipment.tracking_code}`, [
        {
          text: 'تتبع الآن',
          onPress: () => router.replace(`/track/${res.shipment.tracking_code}`),
        },
        { text: 'حسناً' },
      ]);
    } catch (e: any) {
      const fields = e?.fieldErrors
        ? Object.values(e.fieldErrors).flat().join('\n')
        : null;
      Alert.alert('تنبيه', fields ?? e?.message ?? 'تعذر إنشاء الشحنة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.dark} />
        </Pressable>
        <Text style={styles.headerTitle}>{isLater ? 'إحجز لاحقاً' : 'إنشاء شحنة جديدة'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? undefined : 'padding'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled">
          {/* Pickup — opens Google Maps picker */}
          <Text style={styles.section}>نقطة الاستلام</Text>
          <PlaceButton
            icon="location-outline"
            iconColor={colors.orange}
            placeholder="اضغط لتحديد موقع الاستلام على الخريطة"
            place={pickup}
            onPress={() => setPickerTarget('pickup')}
          />

          <Text style={[styles.section, { marginTop: 14 }]}>نقطة التسليم</Text>
          <PlaceButton
            icon="navigate-outline"
            iconColor={colors.green}
            placeholder="اضغط لتحديد موقع التسليم على الخريطة"
            place={dropoff}
            onPress={() => setPickerTarget('dropoff')}
          />

          <Text style={styles.section}>حجم الطرد</Text>
          <View style={styles.chipRow}>
            {PACKAGES.map(p => (
              <Chip
                key={p.key}
                label={`${p.label} • ${p.price}ج`}
                active={pkg === p.key}
                onPress={() => setPkg(p.key)}
              />
            ))}
          </View>

          <Text style={styles.section}>طريقة الدفع</Text>
          <View style={styles.chipRow}>
            {PAYMENTS.map(pm => (
              <Chip
                key={pm.key}
                label={pm.label}
                active={payment === pm.key}
                onPress={() => setPayment(pm.key)}
              />
            ))}
          </View>

          {isLater && (
            <>
              <Text style={styles.section}>التاريخ والوقت</Text>
              <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.dark} />
                <Text style={styles.dateText}>{formatDateTime(date)}</Text>
              </Pressable>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  minimumDate={new Date()}
                  display="default"
                  onChange={(e: DateTimePickerEvent, d?: Date) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (d) setDate(d);
                  }}
                />
              )}
            </>
          )}

          <Text style={styles.section}>ملاحظات (اختياري)</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الإجمالي التقديري</Text>
            <Text style={styles.totalValue}>{selectedPrice} جنيه</Text>
          </View>

          <AppButton title="التالي" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Maps location picker */}
      <LocationPicker
        visible={pickerTarget !== null}
        title={pickerTarget === 'pickup' ? 'موقع الاستلام' : 'موقع التسليم'}
        initial={pickerTarget === 'pickup' ? pickup : dropoff}
        onClose={() => setPickerTarget(null)}
        onConfirm={place => {
          if (pickerTarget === 'pickup') setPickup(place);
          else setDropoff(place);
          setPickerTarget(null);
        }}
      />
    </SafeAreaView>
  );
}

function PlaceButton({
  icon,
  iconColor,
  placeholder,
  place,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  placeholder: string;
  place: PickedPlace | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.placeBtn, pressed && { opacity: 0.9 }]}>
      <View style={[styles.placeIconWrap, { backgroundColor: `${iconColor}22` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.placeText, place && styles.placeTextChosen]} numberOfLines={2}>
          {place ? place.address : placeholder}
        </Text>
        {place && (
          <Text style={styles.placeCoords}>
            {place.lat.toFixed(5)}، {place.lng.toFixed(5)}
          </Text>
        )}
      </View>
      <Ionicons name={place ? 'checkmark-circle' : 'map-outline'} size={22} color={place ? colors.green : colors.textLight} />
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function formatDateTime(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.dark,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.dark,
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'right',
  },
  placeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    minHeight: 62,
  },
  placeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.textLight,
    textAlign: 'right',
    lineHeight: 21,
  },
  placeTextChosen: {
    color: colors.dark,
    fontFamily: fonts.semiBold,
  },
  placeCoords: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  chipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.dark,
  },
  chipTextActive: {
    color: colors.white,
  },
  dateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 50,
    paddingHorizontal: 14,
  },
  dateText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.dark,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  totalLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textGray,
  },
  totalValue: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.dark,
  },
});
