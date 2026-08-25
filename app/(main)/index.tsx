import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { shipmentsApi, type Shipment } from '../../src/api/endpoints';
import { useAuth } from '../../src/store/auth';
import { colors, fonts, radius, STATUS_TEXT } from '../../src/theme';

const CAIRO = {
  latitude: 30.0444,
  longitude: 31.2357,
  latitudeDelta: 0.35,
  longitudeDelta: 0.25,
};

export default function Home() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [region, setRegion] = useState(CAIRO);

  const firstName = user?.name?.split(' ')[0] ?? '';

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await shipmentsApi.list(token);
      setShipments(res.shipments);
    } catch {
      setShipments([]);
    }
  }, [token]);

  useEffect(() => {
    void load();
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.04,
          });
        } catch {}
      }
    })();
  }, [load]);

  const active =
    shipments?.find(
      s =>
        s.status !== 'delivered' &&
        s.status !== 'canceled'
    ) ?? null;

  const deliveredCount = shipments?.filter(s => s.status === 'delivered').length ?? 0;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}>
        {active?.driver?.lat != null && active.driver.lng != null && (
          <Marker
            coordinate={{ latitude: active.driver.lat, longitude: active.driver.lng }}
            title="السائق"
            description={active.driver.name}>
            <View style={styles.marker}>
              <Ionicons name="car" size={18} color={colors.white} />
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Greeting overlay */}
        <View style={styles.greetingCard}>
          <Text style={styles.greeting}>مرحباً {firstName}! 👋</Text>
          <Text style={styles.greetingSub}>جاهز نشحن شحنتك مع ترانزيت اليوم</Text>

          {/* Search bar */}
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push('/booking')}>
            <Ionicons name="search" size={18} color={colors.textGray} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              لا يوجد إدخال ستصل النتائج
            </Text>
          </Pressable>
        </View>

        {/* Active shipment chip */}
        {active && (
          <Pressable
            style={styles.activeChip}
            onPress={() => router.push(`/track/${active.tracking_code}`)}>
            <View style={[styles.pulseDot]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chipTitle}>
                شحنتك {STATUS_TEXT[active.status] ?? active.status}
              </Text>
              <Text style={styles.chipSub}>طلب #{active.tracking_code}</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={colors.dark} />
          </Pressable>
        )}

        {shipments === null && (
          <ActivityIndicator color={colors.dark} style={{ marginTop: 8 }} />
        )}

        <View style={{ flex: 1 }} />

        {/* Floating action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.actionDark]}
            onPress={() => router.push({ pathname: '/booking', params: { mode: 'now' } })}>
            <Ionicons name="add-circle-outline" size={22} color={colors.white} />
            <Text style={[styles.actionText, { color: colors.white }]}>إحجز الآن</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionLight]}
            onPress={() => router.push({ pathname: '/booking', params: { mode: 'later' } })}>
            <Ionicons name="time-outline" size={22} color={colors.dark} />
            <Text style={[styles.actionText, { color: colors.dark }]}>إحجز لاحقاً</Text>
          </Pressable>
        </View>

        {/* Bottom nav */}
        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.dark} />
            <Text style={styles.navLabel}>الإشعارات</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/wallet')}>
            <Ionicons name="wallet-outline" size={22} color={colors.dark} />
            <Text style={styles.navLabel}>المحفظة</Text>
          </Pressable>
          <Pressable style={styles.navItemActive}>
            <Ionicons name="home" size={22} color={colors.white} />
            <Text style={[styles.navLabel, { color: colors.white }]}>الرئيسية</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push({ pathname: '/booking', params: { mode: 'now' } })}>
            <Ionicons name="cube-outline" size={22} color={colors.dark} />
            <Text style={styles.navLabel}>شحنة</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => router.push('/driver-register')}>
            <Ionicons name="car-outline" size={22} color={colors.dark} />
            <Text style={styles.navLabel}>سائق</Text>
          </Pressable>
        </View>

        {deliveredCount > 0 && !active && (
          <Pressable
            onPress={() => {
              const last = shipments!.find(s => s.status === 'delivered');
              if (last) router.push(`/track/${last.tracking_code}`);
            }}
            style={styles.historyRow}>
            <Ionicons name="checkmark-done-circle" size={18} color={colors.green} />
            <Text style={styles.historyText}>{deliveredCount} شحنة تم تسليمها — اضغط للعرض</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  greetingCard: {
    backgroundColor: colors.white + 'F2',
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  greeting: {
    fontFamily: fonts.extraBold,
    fontSize: 19,
    color: colors.dark,
    textAlign: 'right',
  },
  greetingSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textGray,
    textAlign: 'right',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'right',
  },
  activeChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange,
  },
  chipTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
  },
  chipSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textGray,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    height: 54,
    borderRadius: radius.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  actionDark: { backgroundColor: colors.dark },
  actionLight: { backgroundColor: colors.white },
  actionText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  historyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  historyText: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: colors.textGray,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  bottomNav: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.dark,
  },
  navLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: colors.textGray,
    marginTop: 2,
  },
});
