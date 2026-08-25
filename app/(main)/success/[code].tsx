import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import Stars from '../../../src/components/Stars';
import {
  shipmentsApi,
  type Shipment,
} from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

export default function Success() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token } = useAuth();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [stars, setStars] = useState(shipment?.rating?.stars ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [rated, setRated] = useState(false);

  const load = useCallback(async () => {
    if (!token || !code) return;
    try {
      const res = await shipmentsApi.get(token, code);
      setShipment(res.shipment);
      if (res.shipment.rating) {
        setStars(res.shipment.rating.stars);
        setRated(true);
      }
    } catch {}
  }, [token, code]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitRating = async () => {
    if (rated || stars === 0) return;
    setSubmitting(true);
    try {
      await shipmentsApi.rate(token!, code!, stars);
      setRated(true);
      await load();
    } catch {}
    finally {
      setSubmitting(false);
    }
  };

  if (!shipment) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.dark} />
      </View>
    );
  }

  const time = shipment.delivered_at
    ? new Date(shipment.delivered_at).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  return (
    <LinearGradient colors={['#E9F4EA', '#FFFFFF']} locations={[0, 0.5]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        {/* Checkmark */}
        <View style={styles.checkWrap}>
          <View style={styles.checkOuter}>
            <View style={styles.checkInner}>
              <Ionicons name="checkmark" size={54} color="#fff" />
            </View>
          </View>
          <Text style={styles.title}>تم التسليم بنجاح 🎉</Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <DetailRow icon="pricetag" label="رقم الطلب" value={`#${shipment.tracking_code}`} />
          <Divider />
          <DetailRow icon="time-outline" label="الوقت" value={time} />
          <Divider />
          <DetailRow
            icon="cash-outline"
            label="الإجمالي"
            value={`${shipment.price} جنيه`}
          />
          <Divider />
          <DetailRow
            icon="person-outline"
            label="السائق"
            value={shipment.driver?.name ?? '—'}
          />
        </View>

        {/* Rating */}
        <Text style={styles.rateTitle}>تقييم السائق</Text>
        <Text style={styles.rateSub}>كيف كانت تجربتك مع {shipment.driver?.name ?? 'السائق'}؟</Text>
        <View style={{ marginTop: 12 }}>
          <Stars rating={stars} onChange={setStars} size={40} />
        </View>
        {rated && (
          <Text style={styles.thanks}>شكراً لتقييمك! ⭐</Text>
        )}

        <View style={{ flex: 1 }} />

        {!rated && stars > 0 && (
          <AppButton
            title="تقييم السائق"
            onPress={submitRating}
            loading={submitting}
            variant="outline"
            style={{ marginBottom: 10 }}
          />
        )}
        <AppButton title="العودة الرئيسية" onPress={() => router.dismissAll()} style={{ marginBottom: 24 }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowRight}>
        <Ionicons name={icon} size={17} color={colors.textGray} />
        <Text style={[styles.label, { marginLeft: 8 }]}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkWrap: {
    alignItems: 'center',
    marginTop: 34,
  },
  checkOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#DFF2E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 23,
    color: colors.dark,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 26,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  rowRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.textGray,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.dark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  rateTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.dark,
    textAlign: 'center',
    marginTop: 26,
  },
  rateSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 4,
  },
  thanks: {
    alignSelf: 'center',
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.green,
    marginTop: 10,
  },
});
