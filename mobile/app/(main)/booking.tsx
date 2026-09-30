import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import OsmMap, { type LatLng } from '../../src/components/OsmMap';
import LocationPicker, { type PickedPlace } from '../../src/components/LocationPicker';
import { shipmentsApi } from '../../src/api/endpoints';
import { fetchRoute } from '../../src/api/googleMaps';
import { useAuth } from '../../src/store/auth';
import { useLanguage } from '../../src/store/language';
import { useSettings } from '../../src/store/settings';
import { type TranslationKeys } from '../../src/i18n/translations';
import {
  fonts,
  radius,
  useTheme,
  colors as themeColors,
  type ThemeColors,
} from '../../src/theme';
import Logo from '../../src/components/Logo';
import IconButton from '../../src/components/IconButton';
import HoldButton from '../../src/components/HoldButton';
import { PressableScale } from '../../src/components/Motion';
import CountUp from '../../src/components/motion/CountUp';
import { spring } from '../../src/components/motion/presets';
import {
  VEHICLE_ORDER,
  computeTripFare,
  haversineKm,
  minutesRounded,
  vehicleToBackend,
  type VehicleKey,
} from '../../src/lib/fare';

const CAIRO = { latitude: 30.0444, longitude: 31.2357 };

const VEHICLE_IMAGES: Partial<Record<VehicleKey, any>> = {
  trike: require('../../assets/images/tricycle.png'),
  mini: require('../../assets/images/the smaller car.png'),
  pickup: require('../../assets/images/quarter-pickup.png'),
  car: require('../../assets/images/bigger car.png'),
};

export default function Booking() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { token } = useAuth();
  const { t, isRTL } = useLanguage();
  const { dark } = useSettings();

  const [pickup, setPickup] = useState<PickedPlace | null>(null);
  const [dropoff, setDropoff] = useState<PickedPlace | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'pickup' | 'dropoff' | null>(null);
  const [vehicle, setVehicle] = useState<VehicleKey>('car');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchCode, setSearchCode] = useState<string | null>(null);
  const [searchEpoch, setSearchEpoch] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [adjust, setAdjust] = useState(0);
  const [route, setRoute] = useState<{
    key: string;
    distanceKm: number;
    durationMin: number | null;
    polyline: LatLng[] | null;
  } | null>(null);

  const entrance = useSharedValue(0);
  const routeAnim = useSharedValue(0);
  const entranceTrike = useSharedValue(0);
  const entranceMini = useSharedValue(0);
  const entrancePickup = useSharedValue(0);
  const entranceCar = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const firstVehicle = useRef(true);

  const rowDir = isRTL ? ('row-reverse' as const) : ('row' as const);

  const bothPins = pickup != null && dropoff != null;

  const pinsKey =
    bothPins && pickup && dropoff
      ? `${pickup!.lat}|${pickup!.lng}|${dropoff!.lat}|${dropoff!.lng}`
      : null;

  const routing = bothPins && route?.key !== pinsKey;

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 46 }],
  }));

  const entranceFadeStyle = useAnimatedStyle(() => ({ opacity: entrance.value }));

  const routeStyle = useAnimatedStyle(() => ({
    opacity: routeAnim.value,
    transform: [{ translateY: (1 - routeAnim.value) * 10 }],
  }));

  const cardStyles = [
    useAnimatedStyle(() => {
      const active = vehicle === VEHICLE_ORDER[0];
      return {
        opacity: entranceCar.value,
        transform: [
          { translateY: (1 - entranceCar.value) * 22 },
          ...(active ? [{ scale: cardScale.value }] : []),
        ],
      };
    }),
    useAnimatedStyle(() => {
      const active = vehicle === VEHICLE_ORDER[1];
      return {
        opacity: entrancePickup.value,
        transform: [
          { translateY: (1 - entrancePickup.value) * 22 },
          ...(active ? [{ scale: cardScale.value }] : []),
        ],
      };
    }),
    useAnimatedStyle(() => {
      const active = vehicle === VEHICLE_ORDER[2];
      return {
        opacity: entranceMini.value,
        transform: [
          { translateY: (1 - entranceMini.value) * 22 },
          ...(active ? [{ scale: cardScale.value }] : []),
        ],
      };
    }),
    useAnimatedStyle(() => {
      const active = vehicle === VEHICLE_ORDER[3];
      return {
        opacity: entranceTrike.value,
        transform: [
          { translateY: (1 - entranceTrike.value) * 22 },
          ...(active ? [{ scale: cardScale.value }] : []),
        ],
      };
    }),
  ] as const;

  useEffect(() => {
    entrance.value = withSpring(1, spring.entrance);
    entranceCar.value = withTiming(1, { duration: 280 });
    entrancePickup.value = withDelay(90, withTiming(1, { duration: 280 }));
    entranceMini.value = withDelay(180, withTiming(1, { duration: 280 }));
    entranceTrike.value = withDelay(270, withTiming(1, { duration: 280 }));
  }, [entrance, entranceTrike, entranceMini, entrancePickup, entranceCar]);

  useEffect(() => {
    if (!bothPins) return;
    routeAnim.value = 0;
    routeAnim.value = withTiming(1, { duration: 340 });
  }, [bothPins, pinsKey, routeAnim]);

  useEffect(() => {
    if (firstVehicle.current) {
      firstVehicle.current = false;
      return;
    }
    cardScale.value = 0.95;
    cardScale.value = withSpring(1, { damping: 12, stiffness: 220, mass: 0.6 });
  }, [vehicle, cardScale]);

  useEffect(() => {
    if (!bothPins || !pinsKey) return;
    let active = true;
    fetchRoute(
      { latitude: pickup!.lat, longitude: pickup!.lng },
      { latitude: dropoff!.lat, longitude: dropoff!.lng },
      isRTL ? 'ar' : 'en'
    )
      .then(res => {
        if (!active) return;
        setRoute({
          key: pinsKey,
          distanceKm: res.distanceKm ?? haversineKm(pickup!.lat, pickup!.lng, dropoff!.lat, dropoff!.lng),
          durationMin: res.durationMin,
          polyline: res.polyline.length >= 2 ? res.polyline : null,
        });
      })
      .catch(() => {
        if (!active) return;
        setRoute({
          key: pinsKey,
          distanceKm: haversineKm(pickup!.lat, pickup!.lng, dropoff!.lat, dropoff!.lng),
          durationMin: null,
          polyline: null,
        });
      });
    return () => {
      active = false;
    };
  }, [bothPins, pinsKey, pickup, dropoff, isRTL]);

  const fareFor = useCallback(
    (v: VehicleKey) =>
      route && route.key === pinsKey
        ? computeTripFare(v, route.distanceKm, route.durationMin)
        : null,
    [route, pinsKey]
  );
  const fare = fareFor(vehicle);

  const basePrice = fareFor(vehicle)?.price ?? null;
  const decrements = Math.max(0, -adjust);
  const adjustPriceFn = (base: number, steps: number) => Math.round(base * Math.pow(1.04, steps));
  const currentPrice = basePrice != null ? adjustPriceFn(basePrice, adjust) : null;

  useEffect(() => {
    if (!searchCode) return;
    const iv = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [searchCode, searchEpoch]);

  const pushBid = (steps: number) => {
    if (!searchCode || basePrice == null) return;
    const amount = adjustPriceFn(basePrice, steps);
    void shipmentsApi.updateBid(token!, searchCode, amount).catch(() => {});
  };

  const increaseBid = () => {
    const next = adjust + 1;
    setAdjust(next);
    pushBid(next);
  };

  const decreaseBid = () => {
    if (adjust <= -5) return;
    const next = adjust - 1;
    setAdjust(next);
    pushBid(next);
  };

  const raiseNow = () => {
    increaseBid();
    setSecondsLeft(90);
    setSearchEpoch(epoch => epoch + 1);
  };

  const fit = useMemo(() => {
    if (!bothPins) return undefined;
    return {
      points: [
        { latitude: pickup!.lat, longitude: pickup!.lng },
        { latitude: dropoff!.lat, longitude: dropoff!.lng },
      ],
      padding: { top: 140, bottom: 340, left: 70, right: 70 },
      key: `${pickup!.lat}|${dropoff!.lat}`,
    };
  }, [bothPins, pickup, dropoff]);

  const swapPlaces = () => {
    setPickup(dropoff);
    setDropoff(pickup);
    setAdjust(0);
  };

  const requestTrip = async () => {
    if (!pickup || !dropoff) {
      Alert.alert(t.alertWarning, t.alertPickupDropoff);
      return;
    }
    setLoading(true);
    setSearching(true);
    try {
      const res = await shipmentsApi.create(token!, {
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoff.address,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        vehicle_type: vehicleToBackend(vehicle),
        distance_km: fare?.distanceKm ?? route?.distanceKm,
        estimated_duration_min: fare?.durationMin ?? route?.durationMin,
        payment_method: 2,
      });
      const code = res.shipment.tracking_code;
      setSearchCode(code);
      setSecondsLeft(90);
      if (basePrice != null && currentPrice != null && currentPrice !== Math.round(basePrice)) {
        void shipmentsApi.updateBid(token!, code, currentPrice).catch(() => {});
      }
      let currentShipment = res.shipment;
      while (
        currentShipment.status === 'pending' &&
        !currentShipment.driver &&
        !(currentShipment.offers && currentShipment.offers.length > 0)
      ) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const latest = await shipmentsApi.get(token!, res.shipment.tracking_code);
        currentShipment = latest.shipment;
      }
      setSearching(false);
      router.replace(`/track/${res.shipment.tracking_code}`);
    } catch (e: any) {
      setSearching(false);
      const fields = e?.fieldErrors
        ? Object.values(e.fieldErrors).flat().join('\n')
        : null;
      Alert.alert(t.alertWarning, fields ?? e?.message ?? t.alertErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <OsmMap
        style={StyleSheet.absoluteFill}
        center={{ ...CAIRO, zoom: 11, key: 'init' }}
        fit={fit}
        markers={[
          ...(pickup
            ? [{ id: 'pickup', latitude: pickup.lat, longitude: pickup.lng, icon: 'pin' as const, color: colors.brand, label: t.pickupTitle }]
            : []),
          ...(dropoff
            ? [{ id: 'dropoff', latitude: dropoff.lat, longitude: dropoff.lng, icon: 'flag' as const, color: colors.green, label: t.dropoffTitle }]
            : []),
        ]}
        polylines={
          bothPins
            ? [
                (route && route.key === pinsKey && route.polyline && route.polyline.length
                  ? route.polyline
                  : [
                      { latitude: pickup!.lat, longitude: pickup!.lng },
                      { latitude: dropoff!.lat, longitude: dropoff!.lng },
                    ]) as LatLng[],
              ]
            : []
        }
      />

      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <IconButton
            icon={isRTL ? 'chevron-back' : 'chevron-forward'}
            variant="light"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
          />
          <Text style={styles.headerTitle}>{t.bookingNewTitle}</Text>
          <View style={{ width: 38 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'android' ? undefined : 'padding'}
          style={{ flex: 1 }}
          pointerEvents="box-none"
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.sheet, entranceStyle]}>
              <View style={styles.handle} />
              {/* Locations */}
              <Pressable
                onPress={() => setPickerTarget('pickup')}
                style={({ pressed }) => [
                  styles.placeRow,
                  { flexDirection: rowDir },
                  pressed && styles.placeRowPressed,
                ]}>
                <View style={[styles.placeIcon, { backgroundColor: colors.brand + '1A' }]}>
                  <Ionicons name="location" size={15} color={colors.brand} />
                </View>
                <View style={styles.placeTextWrap}>
                  <Text style={styles.placeLabel}>{t.pickupLabel}</Text>
                  <Text style={[styles.placeValue, !pickup && styles.placeEmpty]} numberOfLines={1}>
                    {pickup ? pickup.address : t.pickupPlaceholder}
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={15} color={colors.textLight} />
              </Pressable>

              <View style={[styles.swapWrap, { flexDirection: rowDir }]}>
                <View style={styles.swapLine} />
                <Pressable
                  onPress={swapPlaces}
                  disabled={!bothPins}
                  style={({ pressed }) => [
                    styles.swapBtn,
                    pressed && styles.swapBtnPressed,
                  ]}>
                  <Ionicons name="swap-vertical" size={17} color={bothPins ? colors.dark : colors.textLight} />
                </Pressable>
                <View style={styles.swapLine} />
              </View>

              <Pressable
                onPress={() => setPickerTarget('dropoff')}
                style={({ pressed }) => [
                  styles.placeRow,
                  { flexDirection: rowDir },
                  pressed && styles.placeRowPressed,
                ]}>
                <View style={[styles.placeIcon, { backgroundColor: colors.green + '1A' }]}>
                  <Ionicons name="flag" size={14} color={colors.green} />
                </View>
                <View style={styles.placeTextWrap}>
                  <Text style={styles.placeLabel}>{t.dropoffTitle}</Text>
                  <Text style={[styles.placeValue, !dropoff && styles.placeEmpty]} numberOfLines={1}>
                    {dropoff ? dropoff.address : t.dropoffPlaceholder}
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={15} color={colors.textLight} />
              </Pressable>

              {/* Route summary */}
              {bothPins && (
                <Animated.View
                  style={[
                    styles.routeRow,
                    { flexDirection: rowDir },
                    routeStyle,
                  ]}>
                  {routing ? (
                    <ActivityIndicator size="small" color={colors.dark} />
                  ) : (
                    <>
                      <View style={styles.routeItem}>
                        <Ionicons name="navigate-outline" size={14} color={colors.brand} />
                        <Text style={styles.routeValue}>{route!.distanceKm.toFixed(1)} {t.km}</Text>
                      </View>
                      <View style={styles.routeItem}>
                        <Ionicons name="time-outline" size={14} color={colors.dark} />
                        <Text style={styles.routeValue}>
                          {route!.durationMin != null
                            ? `${minutesRounded(route!.durationMin)} ${t.min}`
                            : t.estTimeFallback}
                        </Text>
                      </View>
                    </>
                  )}
                </Animated.View>
              )}

              {/* Vehicle selection */}
              <Text style={[styles.section, { textAlign: isRTL ? 'right' : 'left' }]}>{t.vehicleTitle}</Text>
              <View style={styles.vehicleList}>
                {VEHICLE_ORDER.map((key, i) => {
                  const active = vehicle === key;
                  const base = fareFor(key)?.price ?? null;
                  const shown = base != null ? (active ? adjustPriceFn(base, adjust) : base) : null;
                  const name =
                    key === 'trike'
                      ? t.vehicleTricycle
                      : key === 'mini'
                        ? t.vehicleMini
                        : key === 'car'
                          ? t.vehicleHalfLoad
                          : t.vehicleQuarterLoad;
                  return (
                    <Animated.View
                      key={key}
                      style={[
                        styles.vehicleItem,
                        cardStyles[i],
                      ]}>
                      <Pressable
                        onPress={() => {
                          setVehicle(key);
                          setAdjust(0);
                        }}
                        style={({ pressed }) => [
                          styles.vehicleRowCard,
                          active ? styles.vehicleRowActive : styles.vehicleRowIdle,
                          pressed && styles.vehicleRowPressed,
                        ]}>
                        <View style={styles.vehicleRowInfo}>
                          <Text style={[styles.vehicleName, active && styles.vehicleNameActive]} numberOfLines={1}>
                            {name}
                          </Text>
                          {base != null && !active && (
                            <Text style={styles.vehicleRowHint}>
                              ≈ {base.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {t.egp}
                            </Text>
                          )}
                          {base != null && active && adjust !== 0 && (
                            <Text style={styles.vehicleRowOriginal}>
                              {t.bidOriginal}: {base.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {t.egp}
                            </Text>
                          )}
                        </View>
                        <View style={styles.vehicleRowEnd}>
                          {shown != null ? (
                            <CountUp
                              value={shown}
                              duration={280}
                              format={n =>
                                `≈ ${Math.round(n).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${t.egp}`
                              }
                              textProps={{
                                style: [styles.vehicleRowPrice, active && styles.vehicleRowPriceActive],
                                numberOfLines: 1,
                              }}
                            />
                          ) : (
                            <ActivityIndicator size="small" color={colors.textGray} />
                          )}
                          <View style={[styles.vehicleRadio, active && styles.vehicleRadioActive]}>
                            {active && <View style={styles.vehicleRadioDot} />}
                          </View>
                        </View>
                        {VEHICLE_IMAGES[key] ? (
                          <Image source={VEHICLE_IMAGES[key]} style={styles.vehicleRowImage} resizeMode="contain" />
                        ) : (
                          <View style={[styles.vehicleRowImage, styles.vehicleRowIcon]}>
                            <MaterialCommunityIcons
                              name="rickshaw"
                              size={52}
                              color={active ? colors.brand : colors.dark}
                            />
                          </View>
                        )}
                      </Pressable>

                      {active && base != null && (
                        <View style={styles.adjustPanel}>
                          <HoldButton
                            onStep={decreaseBid}
                            disabled={adjust <= -5}
                            contentStyle={[
                              styles.adjustBtn,
                              adjust <= -5 && styles.adjustBtnDisabled,
                            ]}
                            pressedStyle={styles.adjustBtnPressed}
                            scaleTo={0.9}>
                            <Ionicons name="remove" size={18} color={adjust <= -5 ? colors.textLight : colors.white} />
                          </HoldButton>
                          <View style={styles.adjustValueWrap}>
                            {shown != null && (
                              <CountUp
                                value={shown}
                                duration={280}
                                format={n =>
                                  `${Math.round(n).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${t.egp}`
                                }
                                textProps={{ style: styles.adjustValue, numberOfLines: 1 }}
                              />
                            )}
                            <Text style={styles.adjustHint}>
                              {t.bidDecreaseLeft}: {Math.max(0, 5 - decrements)}
                            </Text>
                          </View>
                          <HoldButton
                            onStep={increaseBid}
                            contentStyle={[styles.adjustBtn, styles.adjustBtnPlus]}
                            pressedStyle={styles.adjustBtnPressed}
                            scaleTo={0.9}>
                            <Ionicons name="add" size={18} color={colors.white} />
                          </HoldButton>
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>

              {/* Request */}
              <Animated.View style={entranceFadeStyle}>
                <PressableScale
                  onPress={requestTrip}
                  disabled={!bothPins || loading}
                  style={styles.requestBtn}
                  contentStyle={[
                    { flex: 1, flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', gap: 10 },
                    (!bothPins || loading) && styles.requestBtnDisabled,
                  ]}
                  pressedStyle={{ opacity: 0.9 }}>
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.requestText}>{t.requestDriver}</Text>
                      <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={15} color={colors.white} />
                      <View style={styles.requestPriceSlot}>
                        {currentPrice != null ? (
                          <CountUp
                            value={currentPrice}
                            duration={320}
                            format={n =>
                              `${Math.round(n).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${t.egp}`
                            }
                            textProps={{ style: styles.requestPrice, numberOfLines: 1 }}
                          />
                        ) : (
                          <Text style={styles.requestPrice} numberOfLines={1}>
                            {'—'}
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                </PressableScale>
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LocationPicker
        visible={pickerTarget !== null}
        title={pickerTarget === 'pickup' ? t.pickupTitle : t.dropoffTitle}
        initial={pickerTarget === 'pickup' ? pickup : dropoff}
        onClose={() => setPickerTarget(null)}
        onConfirm={place => {
          if (pickerTarget === 'pickup') setPickup(place);
          else setDropoff(place);
          setAdjust(0);
          setPickerTarget(null);
        }}
      />
      <DriverSearchOverlay
        visible={searching}
        isRTL={isRTL}
        title={t.searchingDriverTitle}
        subtitle={t.searchingDriverSub}
        pickup={pickup?.address ?? t.pickupPlaceholder}
        dropoff={dropoff?.address ?? t.dropoffPlaceholder}
        vehicleKey={vehicle}
        basePrice={basePrice}
        currentPrice={currentPrice}
        decrements={decrements}
        secondsLeft={secondsLeft}
        onDecrease={decreaseBid}
        onIncrease={increaseBid}
        onRaiseNow={raiseNow}
        dark={dark}
        t={t}
      />
    </View>
  );
}

function DriverSearchOverlay({
  visible,
  isRTL,
  title,
  subtitle,
  pickup,
  dropoff,
  vehicleKey,
  basePrice,
  currentPrice,
  decrements,
  secondsLeft,
  onDecrease,
  onIncrease,
  onRaiseNow,
  dark,
  t,
}: {
  visible: boolean;
  isRTL: boolean;
  title: string;
  subtitle: string;
  pickup: string;
  dropoff: string;
  vehicleKey: VehicleKey;
  basePrice: number | null;
  currentPrice: number | null;
  decrements: number;
  secondsLeft: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onRaiseNow: () => void;
  dark: boolean;
  t: TranslationKeys;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const pulse = useSharedValue(1);
  const car = useSharedValue(0);
  const timerW = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100 }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );
    car.value = withRepeat(withTiming(1, { duration: 1800 }), -1);
    return () => {
      pulse.value = 1;
      car.value = 0;
    };
  }, [car, pulse, visible]);

  useEffect(() => {
    timerW.value = withTiming(Math.max(0, secondsLeft / 90), { duration: 400 });
  }, [secondsLeft, timerW]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.7, 1.65]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
  }));

  const carStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(car.value, [0, 1], [0, Math.max(120, width - 130)]) },
    ],
  }));

  const timerFillStyle = useAnimatedStyle(() => ({
    width: `${timerW.value * 100}%`,
  }));

  if (!visible) return null;

  const timerDone = secondsLeft <= 0;
  const timerText = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  

  return (
    <View style={styles.searchOverlay}>
      <View style={styles.searchShade} />
      <View style={styles.searchCard}>
        <View style={styles.searchLogo}>
          <Logo width={118} variant={dark ? 'white' : 'dark'} />
        </View>
        <View style={styles.searchAnimation}>
          <Animated.View style={[styles.searchPulse, pulseStyle]} />
          <View style={styles.searchPin}>
            {VEHICLE_IMAGES[vehicleKey] ? (
              <Image source={VEHICLE_IMAGES[vehicleKey]} style={styles.searchCarImage} resizeMode="contain" />
            ) : (
              <View style={styles.searchCarIcon}>
                <MaterialCommunityIcons name="rickshaw" size={34} color={colors.white} />
              </View>
            )}
          </View>
          <View style={styles.searchRoad}>
            <View style={styles.searchRoadDash} />
            <Animated.View style={[styles.searchCar, carStyle]}>
              <Ionicons name="car-sport" size={24} color={colors.white} />
            </Animated.View>
          </View>
        </View>
        <Text style={[styles.searchTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        <Text style={[styles.searchSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>

        <View style={[styles.timerBarWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="timer-outline" size={16} color={colors.brand} />
          <View style={styles.timerBarTrack}>
            <Animated.View style={[styles.timerBarFill, timerFillStyle]} />
          </View>
          <Text style={[styles.timerText, timerDone && styles.timerTextDone]}>{timerText}</Text>
        </View>

        <View style={styles.searchRoute}>
          <View style={styles.searchRouteLine} />
          <View style={styles.searchRouteRow}>
            <View style={[styles.searchDot, { backgroundColor: colors.brand }]} />
            <Text style={styles.searchRouteText} numberOfLines={1}>{pickup}</Text>
          </View>
          <View style={styles.searchRouteRow}>
            <View style={[styles.searchDot, { backgroundColor: colors.green }]} />
            <Text style={styles.searchRouteText} numberOfLines={1}>{dropoff}</Text>
          </View>
        </View>

        {basePrice != null && currentPrice != null && (
          <View style={styles.searchBidCard}>
            <View style={[styles.searchBidRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.searchBidLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.bidYourPrice}
                </Text>
                <Text style={[styles.searchBidHint, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.bidOriginal}: {basePrice.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {t.egp} •{' '}
                  {t.bidDecreaseLeft}: {Math.max(0, 5 - decrements)}
                </Text>
              </View>
              <CountUp
                value={currentPrice}
                duration={320}
                format={n =>
                  `${Math.round(n).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${t.egp}`
                }
                textProps={{ style: styles.searchBidValue, numberOfLines: 1 }}
              />
            </View>
            <View style={[styles.searchBidControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <HoldButton
                onStep={onDecrease}
                disabled={decrements >= 5}
                style={{ flex: 1 }}
                contentStyle={[styles.searchBidBtn, decrements >= 5 && styles.searchBidBtnDisabled]}>
                <Ionicons name="remove" size={18} color={decrements >= 5 ? colors.textLight : colors.dark} />
                <Text style={[styles.searchBidBtnText, decrements >= 5 && { color: colors.textLight }]}>
                  {t.bidDecrease} 4%
                </Text>
              </HoldButton>
              <HoldButton
                onStep={onIncrease}
                style={{ flex: 1 }}
                contentStyle={[styles.searchBidBtn, styles.searchBidBtnActive]}>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={[styles.searchBidBtnText, { color: colors.white }]}>
                  {t.bidIncrease} 4%
                </Text>
              </HoldButton>
            </View>
          </View>
        )}

        {timerDone && (
          <View style={styles.raiseCard}>
            <View style={styles.raiseIcon}>
              <Ionicons name="megaphone-outline" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.raiseTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t.raiseFareAsk}
              </Text>
            </View>
            <PressableScale onPress={onRaiseNow} contentStyle={styles.raiseBtn}>
              <Text style={styles.raiseBtnText}>{t.raiseFareYes}</Text>
            </PressableScale>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.dark,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  sheet: {
    backgroundColor: colors.card + 'D9',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark + '33',
    marginBottom: 2,
  },
  placeRow: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card + 'E6',
    borderWidth: 1.5,
    borderColor: colors.brand + '3D',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  placeRowPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  placeIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeTextWrap: { flex: 1, minWidth: 0, gap: 1 },
  placeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.textGray,
  },
  placeValue: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.dark,
    flexShrink: 1,
  },
  placeEmpty: { color: colors.textGray },
  swapWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  swapLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.card + 'D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtnPressed: { transform: [{ scale: 0.9 }] },
  routeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card + 'E6',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  routeValue: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.dark,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.dark,
    marginTop: 2,
  },
  vehicleList: { gap: 10 },
  vehicleItem: { width: '100%' },
  vehicleRowCard: {
    width: '100%',
    minHeight: 78,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingRight: 92,
  },
  vehicleRowIdle: {
    backgroundColor: colors.card + 'E6',
    borderWidth: 1.5,
    borderColor: colors.divider,
  },
  vehicleRowActive: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.brand,
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  vehicleRowPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  vehicleRowImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 76,
    height: 62,
  },
  vehicleRowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleRowInfo: { flex: 1, minWidth: 0, gap: 2 },
  vehicleRowHint: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textGray,
  },
  vehicleRowOriginal: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textGray,
    textDecorationLine: 'line-through',
  },
  vehicleRowEnd: { alignItems: 'flex-end', gap: 6 },
  vehicleRowPrice: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.dark,
  },
  vehicleRowPriceActive: { color: colors.brand },
  vehicleRadio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleRadioActive: { borderColor: colors.brand },
  vehicleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
  },
  adjustPanel: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card + 'E6',
    borderWidth: 1,
    borderColor: colors.brand + '3D',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  adjustBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  adjustBtnPlus: { backgroundColor: themeColors.dark },
  adjustBtnPressed: { transform: [{ scale: 0.88 }] },
  adjustBtnDisabled: { backgroundColor: colors.divider },
  adjustValueWrap: { flex: 1, alignItems: 'center', gap: 1 },
  adjustValue: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.dark,
  },
  adjustHint: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.textGray,
  },
  vehicleName: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.dark },
  vehicleNameActive: { color: colors.brand },
  requestBtn: {
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    alignSelf: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    overflow: 'hidden',
  },
  requestBtnDisabled: { opacity: 0.55 },
  requestPriceSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  requestPrice: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.white,
  },
  requestText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  searchOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  searchShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30,30,28,0.46)',
  },
  searchCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  searchLogo: { alignItems: 'center', marginBottom: 8 },
  searchAnimation: {
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  searchPulse: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  searchPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
    overflow: 'hidden',
  },
  searchCarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'transparent',
  },
  searchCarIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRoad: {
    position: 'absolute',
    left: 44,
    right: 44,
    bottom: 10,
    height: 22,
    borderTopWidth: 2,
    borderColor: colors.brand + '55',
    overflow: 'hidden',
  },
  searchRoadDash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.brand,
  },
  searchCar: {
    position: 'absolute',
    top: -13,
    left: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: colors.dark,
    marginTop: 4,
  },
  searchSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 22,
    color: colors.textGray,
    marginTop: 4,
  },
  searchRoute: {
    position: 'relative',
    gap: 10,
    marginTop: 18,
    paddingVertical: 2,
  },
  searchRouteLine: {
    position: 'absolute',
    left: 5,
    top: 13,
    bottom: 13,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand + '66',
  },
  searchRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchDot: { width: 11, height: 11, borderRadius: 6, zIndex: 1 },
  searchRouteText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: colors.dark,
  },
  timerBarWrap: {
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timerBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand + '1F',
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  timerText: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: colors.dark,
    minWidth: 46,
    textAlign: 'center',
  },
  timerTextDone: { color: colors.brand },
  searchBidCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.brand + '3D',
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchBidRow: { alignItems: 'center', gap: 10 },
  searchBidLabel: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.dark,
  },
  searchBidHint: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textGray,
    marginTop: 2,
  },
  searchBidValue: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.brand,
  },
  searchBidControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchBidBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: radius.full,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchBidBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  searchBidBtnDisabled: { opacity: 0.45 },
  searchBidBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.dark,
  },
  raiseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: colors.brand + '12',
    borderWidth: 1,
    borderColor: colors.brand + '3D',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  raiseIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 18,
    color: colors.dark,
  },
  raiseBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  raiseBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.white,
  },
});