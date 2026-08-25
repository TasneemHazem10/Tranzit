import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import Stars from '../../../src/components/Stars';
import {
  shipmentsApi,
  type Shipment,
} from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius, STATUS_TEXT } from '../../../src/theme';

const TIMELINE_STEPS = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'] as const;

const STEP_LABELS: Record<string, string> = {
  pending: 'تم إنشاء الطلب',
  assigned: 'تم تعيين السائق',
  picked_up: 'تم استلام الشحنة',
  in_transit: 'في الطريق إلى الوجهة',
  delivered: 'تم تسليم الشحنة',
};

export default function Track() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token || !code) return;
      if (!silent) setLoading(true);
      try {
        const res = await shipmentsApi.get(token, code);
        setShipment(res.shipment);
      } catch (e: any) {
        if (!silent) Alert.alert('تنبيه', e?.message ?? 'تعذر تحميل الشحنة.');
      } finally {
        setLoading(false);
      }
    },
    [token, code]
  );

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(true), 15000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    // Fit map to route when data arrives
    if (!shipment) return;
    const lats = [shipment.pickup_lat, shipment.dropoff_lat].filter(Boolean) as number[];
    const lngs = [shipment.pickup_lng, shipment.dropoff_lng].filter(Boolean) as number[];
    if (lats.length === 2 && lngs.length === 2 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: lats[0], longitude: lngs[0] },
          { latitude: lats[1], longitude: lngs[1] },
        ],
        { edgePadding: { top: 220, bottom: 340, left: 60, right: 60 }, animated: true }
      );
    }
  }, [shipment?.status, shipment?.id]);

  const advance = async () => {
    try {
      await shipmentsApi.advance(token!, code);
      await load();
    } catch (e: any) {
      Alert.alert('تنبيه', e?.message ?? 'تعذر التحديث.');
    }
  };

  if (loading || !shipment) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.dark} />
      </View>
    );
  }

  const isDelivered = shipment.status === 'delivered';
  const currentIndex = TIMELINE_STEPS.indexOf(
    shipment.status as (typeof TIMELINE_STEPS)[number]
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: shipment.pickup_lat ?? 30.0444,
          longitude: shipment.pickup_lng ?? 31.2357,
          latitudeDelta: 0.3,
          longitudeDelta: 0.25,
        }}
        showsUserLocation>
        {shipment.pickup_lat != null && shipment.pickup_lng != null && (
          <Marker
            coordinate={{ latitude: shipment.pickup_lat, longitude: shipment.pickup_lng }}
            title="الاستلام">
            <View style={[styles.pin, { backgroundColor: colors.orange }]}>
              <Ionicons name="cube-outline" size={16} color="#fff" />
            </View>
          </Marker>
        )}
        {shipment.dropoff_lat != null && shipment.dropoff_lng != null && (
          <Marker
            coordinate={{ latitude: shipment.dropoff_lat, longitude: shipment.dropoff_lng }}
            title="التسليم">
            <View style={[styles.pin, { backgroundColor: colors.green }]}>
              <Ionicons name="location" size={16} color="#fff" />
            </View>
          </Marker>
        )}
        {shipment.driver?.lat != null && shipment.driver?.lng != null && !isDelivered && (
          <Marker
            coordinate={{ latitude: shipment.driver.lat, longitude: shipment.driver.lng }}
            title={shipment.driver.name}>
            <View style={[styles.pin, { backgroundColor: colors.dark }]}>
              <Ionicons name="car-sport-outline" size={16} color="#fff" />
            </View>
          </Marker>
        )}
        {shipment.pickup_lat != null &&
          shipment.pickup_lng != null &&
          shipment.dropoff_lat != null &&
          shipment.dropoff_lng != null && (
            <Polyline
              coordinates={[
                { latitude: shipment.pickup_lat, longitude: shipment.pickup_lng },
                { latitude: shipment.dropoff_lat, longitude: shipment.dropoff_lng },
              ]}
              strokeColors={[colors.border, colors.orange]}
              strokeWidth={4}
            />
          )}
      </MapView>

      <SafeAreaView style={styles.safe}>
        {/* Status floating card */}
        <View style={styles.statusCard}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={20} color={colors.dark} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusText}>{STATUS_TEXT[shipment.status]}</Text>
            <Text style={styles.orderId}>رقم الطلب #{shipment.tracking_code}</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isDelivered ? colors.green : colors.orange },
            ]}
          />
        </View>

        {/* Bottom sheet */}
        <View style={{ flex: 1 }} />
        <View style={styles.sheet}>
          {shipment.driver && (
            <View style={styles.driverRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {shipment.driver.name.trim().charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{shipment.driver.name}</Text>
                <View style={styles.ratingRow}>
                  <Stars rating={shipment.driver.rating_avg} size={13} />
                  <Text style={styles.ratingText}>
                    {shipment.driver.rating_avg.toFixed(1)} • {shipment.driver.vehicle_type}{' '}
                    {shipment.driver.vehicle_plate}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.callBtn}
                onPress={() => {
                  if (shipment.driver?.phone) {
                    Linking.openURL(`tel:${shipment.driver.phone}`);
                  }
                }}>
                <Ionicons name="call" size={19} color={colors.white} />
              </Pressable>
              <Pressable
                style={[styles.callBtn, { backgroundColor: colors.orange }]}
                onPress={() => {
                  if (shipment.driver) {
                    router.push({ pathname: '/chat/[driverId]', params: { driverId: String(shipment.driver.id), driverName: shipment.driver.name } });
                  }
                }}>
                <Ionicons name="chatbubble-ellipses" size={19} color={colors.white} />
              </Pressable>
            </View>
          )}

          {/* Timeline */}
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentIndex >= i && currentIndex !== -1;
              const isCurrent = currentIndex === i;
              return (
                <View key={step} style={styles.timelineRow}>
                  <View style={styles.timelineRight}>
                    <View
                      style={[
                        styles.timelineDot,
                        done && styles.timelineDotDone,
                        isCurrent && styles.timelineDotCurrent,
                      ]}>
                      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.line, done && styles.lineDone]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        done && styles.timelineLabelDone,
                      ]}>
                      {STEP_LABELS[step]}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.timelineTime}>الآن</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {__DEV__ && !isDelivered && (
            <Pressable onPress={advance} style={styles.devBtn}>
              <Ionicons name="play-forward" size={15} color={colors.textGray} />
              <Text style={styles.devText}>محاكاة تقدم الشحنة (تطوير)</Text>
            </Pressable>
          )}

          {!isDelivered && shipment.status === 'in_transit' ? (
            <AppButton
              title="تأكيد التسليم"
              onPress={() => router.push(`/confirm-delivery/${code}`)}
              style={{ marginTop: 10 }}
            />
          ) : isDelivered ? (
            <AppButton
              title={shipment.rating ? 'عرض التفاصيل' : 'تقييم الشحنة'}
              onPress={() => router.replace(`/success/${code}`)}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statusCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.dark,
    textAlign: 'right',
  },
  orderId: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textGray,
    textAlign: 'right',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 18,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  driverRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 19,
  },
  driverName: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: colors.dark,
    textAlign: 'right',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  ratingText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textGray,
    flexShrink: 1,
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    marginVertical: 8,
  },
  timelineRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    height: 44,
  },
  timelineRight: {
    alignItems: 'center',
    width: 22,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  timelineDotCurrent: {
    borderColor: colors.orange,
    borderWidth: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
  },
  lineDone: {
    backgroundColor: colors.green,
  },
  timelineLabel: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: 1,
  },
  timelineLabelDone: {
    color: colors.dark,
    fontFamily: fonts.semiBold,
  },
  timelineTime: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.orange,
  },
  devBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    marginBottom: 6,
  },
  devText: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.textGray,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
