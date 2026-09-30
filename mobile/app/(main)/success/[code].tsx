import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import Stars from '../../../src/components/Stars';
import { Entrance, Pulse, Skeleton } from '../../../src/components/Motion';
import {
  shipmentsApi,
  type Shipment,
} from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { useLanguage } from '../../../src/store/language';
import { fonts, radius, useTheme, type ThemeColors } from '../../../src/theme';

export default function Success() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token } = useAuth();
  const { t, isRTL } = useLanguage();

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
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
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
        <Skeleton height={92} radius={46} />
        <Skeleton height={200} radius={radius.lg} />
      </View>
    );
  }

  const time = shipment.delivered_at
    ? new Date(shipment.delivered_at).toLocaleTimeString(
        isRTL ? 'ar-EG' : 'en-US',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      )
    : '--:--';

  return (
    <LinearGradient colors={[colors.brandSoft, colors.background]} locations={[0, 0.5]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        {/* Checkmark */}
        <View style={styles.checkWrap}>
          <Pulse color={colors.green} size={108} duration={2000} />
          <Entrance scaleFrom={0.3} distance={0} delay={80}>
            <View style={styles.checkOuter}>
              <View style={styles.checkInner}>
                <Ionicons name="checkmark" size={54} color="#fff" />
              </View>
            </View>
          </Entrance>
          <Entrance direction="up" delay={240}>
            <Text style={styles.title}>{t.successTitle}</Text>
          </Entrance>
        </View>

        {/* Details card */}
        <Entrance direction="up" delay={320}>
          <View style={styles.card}>
            <DetailRow icon="pricetag" label={t.orderId} value={`#${shipment.tracking_code}`} isRTL={isRTL} delay={380} />
            <Divider />
            <DetailRow icon="time-outline" label={t.successTime} value={time} isRTL={isRTL} delay={420} />
            <Divider />
            <DetailRow
              icon="cash-outline"
              label={t.successTotal}
              value={`${shipment.price} ${t.egp}`}
              isRTL={isRTL}
              delay={460}
            />
            <Divider />
            <DetailRow
              icon="person-outline"
              label={t.successDriver}
              value={shipment.driver?.name ?? '—'}
              isRTL={isRTL}
              delay={500}
            />
          </View>
        </Entrance>

        {/* Rating */}
        <Entrance direction="up" delay={560}>
          <Text style={styles.rateTitle}>{t.rateTitle}</Text>
          <Text style={styles.rateSub}>{t.rateSub} {shipment.driver?.name ?? t.successDriver}</Text>
          <View style={{ marginTop: 12 }}>
            <Stars rating={stars} onChange={setStars} size={40} />
          </View>
          {rated && (
            <Text style={styles.thanks}>{t.rateThanks}</Text>
          )}
        </Entrance>

        <View style={{ flex: 1 }} />

        {!rated && stars > 0 && (
          <AppButton
            title={t.rateBtn}
            onPress={submitRating}
            loading={submitting}
            variant="outline"
            style={{ marginBottom: 10 }}
          />
        )}
        <AppButton title={t.homeBtn} onPress={() => router.dismissAll()} style={{ marginBottom: 24 }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isRTL,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isRTL: boolean;
  delay: number;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <Entrance direction="up" distance={10} delay={delay}>
      <View style={styles.row}>
        <View style={styles.rowRight}>
          <Ionicons name={icon} size={17} color={colors.textGray} />
          <Text style={[styles.label, { marginStart: 8 }]}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
    </Entrance>
  );
}

function Divider() {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.divider} />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', gap: 20, paddingHorizontal: 24 },
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
    backgroundColor: colors.card,
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
