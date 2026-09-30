import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import OsmMap from '../../src/components/OsmMap';
import MenuOverlay from '../../src/components/MenuOverlay';
import MenuButton from '../../src/components/MenuButton';
import { Entrance, PressableScale, Pulse, Skeleton } from '../../src/components/Motion';
import DraggableSheet from '../../src/components/motion/DraggableSheet';
import LocateButton, { type LocationState } from '../../src/components/LocateButton';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { shipmentsApi, type Shipment } from '../../src/api/endpoints';
import { useAuth } from '../../src/store/auth';
import { useLanguage } from '../../src/store/language';
import { fonts, radius, useTheme, type ThemeColors } from '../../src/theme';

const STATUS_MAP: Record<string, string> = {
  pending: 'statusPending',
  assigned: 'statusAssigned',
  picked_up: 'statusPickedUp',
  in_transit: 'statusInTransit',
  delivered: 'statusDelivered',
  canceled: 'statusCanceled',
};

const CAIRO = {
  latitude: 30.0444,
  longitude: 31.2357,
  latitudeDelta: 0.35,
  longitudeDelta: 0.25,
};

export default function Home() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { token } = useAuth();
  const { t, isRTL } = useLanguage();
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [gpsFocus, setGpsFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    key: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sheetVisible, setSheetVisible] = useState(true);
  const [locState, setLocState] = useState<LocationState>('idle');

  const rowDir = isRTL ? ('row-reverse' as const) : ('row' as const);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await shipmentsApi.list(token);
      setShipments(res.shipments);
    } catch {
      setShipments([]);
    }
  }, [token]);

  const detectLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocState('denied');
      return;
    }
    setLocState('detecting');
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setGpsFocus({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        zoom: 15,
        key: `loc-${Date.now()}`,
      });
      setLocState('ready');
    } catch {
      setLocState('error');
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    void detectLocation();
  }, [load, detectLocation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const active =
    shipments?.find(
      s => s.status !== 'delivered' && s.status !== 'canceled'
    ) ?? null;

  const going = active && active.status !== 'pending';

  const onCancel = () => {
    if (!active) return;
    Alert.alert(t.alertWarning, t.cancelRequestNote, [
      { text: t.alertNo, style: 'cancel' },
      {
        text: t.alertYes,
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await shipmentsApi.cancel(token!, active.tracking_code);
            Alert.alert(t.alertSuccess, res.message ?? t.cancelRequestSuccess);
            setShipments(prev => prev?.map(s => (s.id === active.id ? { ...s, status: 'canceled' as const } : s)) ?? null);
          } catch (e: any) {
            Alert.alert(t.alertWarning, e?.message ?? t.alertErrorGeneric);
          }
        },
      },
    ]);
  };

  const openBooking = () => {
    router.push('/booking');
  };

  return (
    <View style={styles.container}>
      <OsmMap
        style={StyleSheet.absoluteFill}
        center={{ latitude: CAIRO.latitude, longitude: CAIRO.longitude, zoom: 11, key: 'init' }}
        animateTo={gpsFocus}
        markers={[
          ...(userLocation
            ? [{ id: 'user', icon: 'user' as const, ...userLocation }]
            : []),
          ...(active?.driver?.lat != null && active.driver.lng != null
            ? [
                {
                  id: 'driver',
                  latitude: active.driver.lat,
                  longitude: active.driver.lng,
                  icon: 'car' as const,
                  color: colors.brand,
                  label: active.driver.name,
                  z: 500,
                },
              ]
            : []),
        ]}
      />

      <SafeAreaView style={styles.safe} edges={['top']} pointerEvents="box-none">
        {/* Top-left: menu button */}
        <Entrance delay={80} direction="down" distance={14}>
          <View style={styles.topLeft}>
            <MenuButton open={menuOpen} onPress={() => setMenuOpen(v => !v)} />
            <View style={styles.locateSlot}>
              <LocateButton
                state={locState}
                onPress={() => void detectLocation()}
              />
            </View>
          </View>
        </Entrance>

        {shipments === null && (
          <View style={styles.skeletonBlock}>
            <Skeleton height={112} radius={radius.xl} />
            <Skeleton height={112} radius={radius.xl} />
          </View>
        )}

        <View style={{ flex: 1 }} />
      </SafeAreaView>

      {/* Draggable bottom sheet */}
      {sheetVisible ? (
        <DraggableSheet
          peekHeight={168}
          initialSnap="full"
          onSnapChange={s => {
            if (s === 'hidden') setSheetVisible(false);
          }}
          style={styles.sheetShell}>
          <View style={{ width: '100%' }}>
            {going && active ? (
              <View style={styles.inTransit}>
                <PressableScale
                  onPress={() => router.push(`/track/${active.tracking_code}`)}
                  contentStyle={[styles.transitRow, { flexDirection: rowDir }]}>
                  <View style={styles.liveWrap}>
                    <View style={styles.transitDot} />
                    <Pulse color={colors.brand} size={14} duration={1700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.transitTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.inTransitTitle}
                    </Text>
                    <Text style={[styles.transitSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.inTransitSub}
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={20}
                    color={colors.brand}
                  />
                </PressableScale>

                <PressableScale
                  onPress={() => router.push(`/track/${active.tracking_code}`)}
                  style={styles.shipmentCard}
                  contentStyle={{ flexDirection: rowDir, alignItems: 'center', gap: 12 }}>
                  <View style={styles.codeBox}>
                    <LinearGradient
                      colors={[colors.brand, colors.brandDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.codeBoxText}>#{active.tracking_code.slice(-4).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.shipmentCardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t[STATUS_MAP[active.status] as keyof typeof t] ?? active.status}
                    </Text>
                    <Text style={[styles.shipmentCardSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.activeChipSub}{active.tracking_code}
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.textLight}
                  />
                </PressableScale>

                {active.driver?.id != null && (
                  <View style={[styles.driverCard, { flexDirection: rowDir }]}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={22} color={colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.driverName, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {active.driver.name}
                      </Text>
                      <Text style={[styles.driverMeta, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {t.driverLabel} ● ★ {active.driver.rating_avg ?? '—'}
                      </Text>
                    </View>
                    <PressableScale
                      onPress={() =>
                        router.push({
                          pathname: '/call/[driverId]',
                          params: { driverId: String(active.driver!.id), driverName: active.driver!.name },
                        } as never)
                      }
                      contentStyle={[styles.iconBtn, styles.iconBtnActive]}>
                      <Ionicons name="call" size={18} color={colors.white} />
                    </PressableScale>
                  </View>
                )}

                <PressableScale
                  onPress={onCancel}
                  contentStyle={[styles.cancelBtn, { flexDirection: rowDir }]}>
                  <Ionicons name="close" size={18} color={colors.red} />
                  <Text style={styles.cancelBtnText}>{t.cancelRequest}</Text>
                </PressableScale>
              </View>
            ) : (
              <View style={styles.bookSheet}>
                <Entrance direction="up" distance={12}>
                  <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.homeSheetTitle}
                  </Text>
                </Entrance>

                <Entrance direction="up" distance={12} delay={40}>
                  <PressableScale
                    onPress={openBooking}
                    style={styles.field}
                    contentStyle={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
                    <View style={[styles.fieldDot, { backgroundColor: colors.brand }]} />
                    <Text style={styles.fieldLabel}>{t.pickupLabel}</Text>
                    <Text style={styles.fieldValue} numberOfLines={1}>
                      {t.pickupPlaceholder}
                    </Text>
                  </PressableScale>
                </Entrance>

                <Entrance direction="up" distance={12} delay={80}>
                  <PressableScale
                    onPress={openBooking}
                    style={styles.field}
                    contentStyle={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
                    <View style={[styles.fieldDot, { backgroundColor: colors.green }]} />
                    <Text style={styles.fieldLabel}>{t.dropoffTitle}</Text>
                    <Text style={styles.fieldValue} numberOfLines={1}>
                      {t.dropoffPlaceholder}
                    </Text>
                  </PressableScale>
                </Entrance>

                <Entrance direction="up" distance={12} delay={120}>
                  <PressableScale
                    onPress={openBooking}
                    style={styles.nextBtn}
                    contentStyle={{ flex: 1, flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <LinearGradient
                      colors={[colors.brand, colors.brandDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="cube" size={17} color={colors.white} />
                    <Text style={styles.nextBtnText}>{t.requestDriver}</Text>
                  </PressableScale>
                </Entrance>
              </View>
            )}
          </View>
        </DraggableSheet>
      ) : (
        <SafeAreaView edges={['bottom']} style={styles.reopenWrap} pointerEvents="box-none">
          <Entrance direction="up" distance={16}>
            <PressableScale onPress={() => setSheetVisible(true)} contentStyle={styles.reopenBtn}>
              <LinearGradient
                colors={[colors.brand, colors.brandDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="cube" size={17} color={colors.white} />
              <Text style={styles.nextBtnText}>{t.requestDriver}</Text>
            </PressableScale>
          </Entrance>
        </SafeAreaView>
      )}

      <MenuOverlay visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  topLeft: {
    alignItems: 'flex-start',
    gap: 2,
    marginTop: 0,
  },
  locateSlot: {
    marginTop: 6,
  },
  sheetShell: {},
  bookSheet: {
    gap: 8,
  },
  reopenWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: radius.full,
    paddingHorizontal: 26,
    backgroundColor: colors.brand,
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sheetTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    color: colors.dark,
  },
  field: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: colors.card + 'E6',
    borderWidth: 1.5,
    borderColor: colors.brand + '3D',
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fieldPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  fieldDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.dark,
  },
  fieldValue: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textGray,
    flexShrink: 1,
  },
  nextBtn: {
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 2,
    paddingHorizontal: 16,
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    overflow: 'hidden',
  },
  nextBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  nextBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.white,
  },
  inTransit: {
    gap: 10,
  },
  transitRow: {
    alignItems: 'center',
    gap: 10,
  },
  liveWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  skeletonBlock: {
    marginTop: 22,
    gap: 12,
  },
  transitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  transitTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.dark,
  },
  transitSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textGray,
  },
  shipmentCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: 12,
  },
  codeBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  shipmentCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.dark,
  },
  shipmentCardSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textGray,
    marginTop: 2,
  },
  driverCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.darkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.dark,
  },
  driverMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textGray,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card + 'E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cancelBtn: {
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.red + '66',
    backgroundColor: colors.card + 'E6',
  },
  cancelBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.red,
  },
});