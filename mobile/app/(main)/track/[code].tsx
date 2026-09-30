import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import OsmMap, { type LatLng } from '../../../src/components/OsmMap';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import IconButton from '../../../src/components/IconButton';
import HoldButton from '../../../src/components/HoldButton';
import Stars from '../../../src/components/Stars';
import { Entrance, PressableScale, Pulse, Skeleton } from '../../../src/components/Motion';
import CountUp from '../../../src/components/motion/CountUp';
import {
  shipmentsApi,
  type Shipment,
} from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { useLanguage } from '../../../src/store/language';
import { fetchRoute, type RoutePoint } from '../../../src/api/googleMaps';
import { colors as themeColors, fonts, radius, useTheme, type ThemeColors } from '../../../src/theme';
import { adjustBid } from '../../../src/lib/fare';

const TIMELINE_STEPS = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'] as const;

export default function Track() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token } = useAuth();
  const { t, isRTL } = useLanguage();
  const rowDir = isRTL ? ('row' as const) : ('row-reverse' as const);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<{ coords: string; polyline: RoutePoint[] } | null>(null);

  const STEP_LABELS: Record<string, string> = useMemo(() => ({
    pending: t.timelinePending,
    assigned: t.timelineAssigned,
    picked_up: t.timelinePickedUp,
    in_transit: t.timelineInTransit,
    delivered: t.timelineDelivered,
  }), [t]);

  const STATUS_MAP: Record<string, string> = useMemo(() => ({
    pending: t.statusPending,
    assigned: t.statusAssigned,
    picked_up: t.statusPickedUp,
    in_transit: t.statusInTransit,
    delivered: t.statusDelivered,
    canceled: t.statusCanceled,
  }), [t]);

  const load = useCallback(
    async (silent = false) => {
      if (!token || !code) return;
      if (!silent) setLoading(true);
      try {
        const res = await shipmentsApi.get(token, code);
        setShipment(res.shipment);
      } catch (e: any) {
        if (!silent) Alert.alert(t.alertWarning, e?.message ?? t.alertShipmentLoadError);
      } finally {
        setLoading(false);
      }
    },
    [token, code, t]
  );

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const interval = setInterval(() => void load(true), 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [load]);

  const pickupLat = shipment?.pickup_lat ?? null;
  const pickupLng = shipment?.pickup_lng ?? null;
  const dropoffLat = shipment?.dropoff_lat ?? null;
  const dropoffLng = shipment?.dropoff_lng ?? null;

  const routeCoordsKey =
    pickupLat != null &&
    pickupLng != null &&
    dropoffLat != null &&
    dropoffLng != null
      ? `${pickupLat}|${pickupLng}|${dropoffLat}|${dropoffLng}`
      : null;

  useEffect(() => {
    if (!routeCoordsKey) return;
    let active = true;
    fetchRoute(
      { latitude: pickupLat as number, longitude: pickupLng as number },
      { latitude: dropoffLat as number, longitude: dropoffLng as number },
      isRTL ? 'ar' : 'en'
    )
      .then(res => {
        if (active && res.polyline.length >= 2) {
          setRoute({ coords: routeCoordsKey, polyline: res.polyline });
        }
      })
      .catch(() => {
        /* keep the straight-line fallback */
      });
    return () => {
      active = false;
    };
  }, [routeCoordsKey, isRTL, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const shownRoute = route?.coords === routeCoordsKey ? route.polyline : null;

  const fit = useMemo(() => {
    if (
      !shipment ||
      shipment.pickup_lat == null ||
      shipment.pickup_lng == null ||
      shipment.dropoff_lat == null ||
      shipment.dropoff_lng == null
    ) {
      return null;
    }
    return {
      points: [
        { latitude: shipment.pickup_lat, longitude: shipment.pickup_lng },
        { latitude: shipment.dropoff_lat, longitude: shipment.dropoff_lng },
      ],
      padding: { top: 220, bottom: 340, left: 60, right: 60 },
      key: `${shipment.id}-${shipment.status}`,
    };
  }, [shipment]);

  const formatTime = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stepTimes = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of shipment?.statuses ?? []) {
      if (!map[entry.status]) map[entry.status] = formatTime(entry.occurred_at);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment, isRTL]);

  const advance = async () => {
    try {
      await shipmentsApi.advance(token!, code);
      await load();
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertAdvanceError);
    }
  };

  const cancelShipment = async () => {
    Alert.alert(t.cancelShipment, t.cancelConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.cancelShipment,
        style: 'destructive',
        onPress: async () => {
          try {
            await shipmentsApi.cancel(token!, code);
            Alert.alert(t.alertSuccess, t.cancelShipmentSuccess, [
              { text: t.alertOk, onPress: () => router.replace('/') },
            ]);
          } catch (e: any) {
            Alert.alert(t.alertWarning, e?.message ?? t.cancelShipmentError);
          }
        },
      },
    ]);
  };

  const basePrice = Math.round(shipment?.price ?? shipment?.estimated_price ?? 0);

  const [bid, setBid] = useState(basePrice);
  const [decrements, setDecrements] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const pendingStatus = shipment?.status;
  const shipmentCreatedAt = shipment?.created_at;
  const [prevBase, setPrevBase] = useState(basePrice);
  if (prevBase !== basePrice) {
    setPrevBase(basePrice);
    setBid(basePrice);
    setDecrements(0);
  }
  const decreaseBid = () => {
    if (decrements >= 5) return;
    const nextBid = adjustBid(bid, 'decrease');
    setDecrements(value => value + 1);
    setBid(nextBid);
    void shipmentsApi.updateBid(token!, code!, nextBid);
  };

  const increaseBid = () => {
    const nextBid = adjustBid(bid, 'increase');
    setBid(nextBid);
    void shipmentsApi.updateBid(token!, code!, nextBid);
  };

  useEffect(() => {
    if (pendingStatus !== 'pending' || !shipmentCreatedAt) return;
    const startedAt = new Date(shipmentCreatedAt).getTime();
    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(Math.max(0, 90 - elapsed));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [pendingStatus, shipmentCreatedAt]);

  const simulateOffer = async () => {
    try {
      const res = await shipmentsApi.simulateOffer(token!, code!, bid > 0 ? bid : undefined);
      setShipment(res.shipment);
      Alert.alert(t.alertSuccess, `${t.offerDriverName}: ${res.offer.driver?.name ?? ''} • ${res.offer.amount} ${t.egp}`);
    } catch (e: any) {
      Alert.alert(t.alertWarning, e?.message ?? t.alertErrorGeneric);
    }
  };

  const acceptOffer = (offerId: number) => {
    Alert.alert(t.acceptOffer, t.offerAcceptedMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.acceptOffer,
        onPress: async () => {
          try {
            const res = await shipmentsApi.acceptOffer(token!, code!, offerId);
            setShipment(res.shipment);
            Alert.alert(t.alertSuccess, t.offerAccepted);
          } catch (e: any) {
            Alert.alert(t.alertWarning, e?.message ?? t.alertErrorGeneric);
          }
        },
      },
    ]);
  };

  const declineOffer = (offerId: number) => {
    Alert.alert(t.declineOffer, t.offerDeclinedMsg, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.declineOffer,
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await shipmentsApi.declineOffer(token!, code!, offerId);
            setShipment(res.shipment);
            Alert.alert(t.alertSuccess, t.offerDeclined);
          } catch (e: any) {
            Alert.alert(t.alertWarning, e?.message ?? t.alertErrorGeneric);
          }
        },
      },
    ]);
  };

  if (loading || !shipment) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton height={72} radius={radius.lg} style={styles.loadingStatus} />
        <View style={styles.loadingSheet}>
          <Skeleton height={46} radius={radius.md} />
          <Skeleton height={150} radius={radius.lg} />
          <Skeleton height={44} radius={radius.md} />
        </View>
      </View>
    );
  }

  const isDelivered = shipment.status === 'delivered';
  const isCanceled = shipment.status === 'canceled';
  const currentIndex = TIMELINE_STEPS.indexOf(
    shipment.status as (typeof TIMELINE_STEPS)[number]
  );

  return (
    <View style={styles.container}>
      <OsmMap
        style={StyleSheet.absoluteFill}
        center={{
          latitude: shipment.pickup_lat ?? 30.0444,
          longitude: shipment.pickup_lng ?? 31.2357,
          zoom: 12,
          key: 'ship',
        }}
        fit={fit}
        markers={[
          ...(shipment.pickup_lat != null && shipment.pickup_lng != null
            ? [
                {
                  id: 'pickup',
                  latitude: shipment.pickup_lat,
                  longitude: shipment.pickup_lng,
                  icon: 'cube' as const,
                  color: colors.dark,
                  label: t.pickupTitle,
                },
              ]
            : []),
          ...(shipment.dropoff_lat != null && shipment.dropoff_lng != null
            ? [
                {
                  id: 'dropoff',
                  latitude: shipment.dropoff_lat,
                  longitude: shipment.dropoff_lng,
                  icon: 'flag' as const,
                  color: colors.green,
                  label: t.dropoffTitle,
                },
              ]
            : []),
          ...(shipment.driver?.lat != null && shipment.driver?.lng != null && !isDelivered && !isCanceled
            ? [
                {
                  id: 'driver',
                  latitude: shipment.driver.lat,
                  longitude: shipment.driver.lng,
                  icon: 'car' as const,
                  color: colors.dark,
                  label: shipment.driver.name,
                  z: 500,
                },
              ]
            : []),
        ]}
        polylines={
          pickupLat != null &&
          pickupLng != null &&
          dropoffLat != null &&
          dropoffLng != null
            ? [
                (shownRoute?.length
                  ? shownRoute
                  : [
                      { latitude: pickupLat, longitude: pickupLng },
                      { latitude: dropoffLat, longitude: dropoffLng },
                    ]) as LatLng[],
              ]
            : []
        }
      />

      <SafeAreaView style={styles.safe}>
        {/* Status floating card */}
        <Entrance direction="down" distance={14}>
          <PressableScale
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
            style={styles.statusCard}
            contentStyle={{
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 12,
              flex: 1,
            }}>
            <IconButton
              icon={isRTL ? 'chevron-back' : 'chevron-forward'}
              size="sm"
              variant="light"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusText}>{STATUS_MAP[shipment.status] ?? shipment.status}</Text>
              <Text style={styles.orderId}>{t.orderId}#{shipment.tracking_code}</Text>
            </View>
            <View style={styles.liveWrap}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isDelivered ? colors.green : colors.brand },
                ]}
              />
              <Pulse color={isDelivered ? colors.green : colors.brand} size={12} />
            </View>
          </PressableScale>
        </Entrance>

        {/* Bottom sheet */}
        <View style={{ flex: 1 }} />
        <Entrance direction="up" distance={26} delay={80}>
          <View style={styles.sheet}>
            <LinearGradient
              colors={[colors.brand, colors.brandDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />
            {shipment.driver && (
              <View
                style={[
                  styles.driverRow,
                  { flexDirection: isRTL ? 'row' : 'row-reverse' },
                ]}>
                <LinearGradient
                  colors={[colors.dark, '#333']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {shipment.driver.name.trim().charAt(0)}
                  </Text>
                </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{shipment.driver.name}</Text>
                <View style={[styles.ratingRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                  <Stars rating={shipment.driver.rating_avg} size={13} />
                  <Text style={styles.ratingText}>
                    {shipment.driver.rating_avg.toFixed(1)} • {shipment.driver.vehicle_type}{' '}
                    {shipment.driver.vehicle_plate}
                  </Text>
                </View>
              </View>
              <IconButton
                icon="call"
                size="lg"
                variant="light"
                tint={colors.green}
                onPress={() => {
                  if (shipment.driver?.phone) {
                    Linking.openURL(`tel:${shipment.driver.phone}`);
                  }
                }}
              />
            </View>
          )}

          {/* Timeline */}
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, i) => {
              const done = currentIndex >= i && currentIndex !== -1;
              const isCurrent = currentIndex === i;
              return (
                <View key={step} style={[styles.timelineRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                  <View style={styles.timelineRight}>
                    <View
                      style={[
                        styles.timelineDot,
                        done && styles.timelineDotDone,
                        isCurrent && styles.timelineDotCurrent,
                      ]}>
                      {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    {isCurrent && !done && !isCanceled && (
                      <Pulse color={colors.brand} size={20} />
                    )}
                    {i < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.line, done && styles.lineDone]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isCanceled ? styles.timelineLabelCanceled : done && styles.timelineLabelDone,
                      ]}>
                      {STEP_LABELS[step]}
                    </Text>
                    {stepTimes[step] ? (
                      <Text style={styles.timelineTime}>{stepTimes[step]}</Text>
                    ) : isCurrent && !isCanceled ? (
                      <Text style={styles.timelineTime}>{t.now}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {isCanceled && (
              <View style={[styles.timelineRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <View style={styles.timelineRight}>
                  <View style={[styles.timelineDot, styles.timelineDotCancel]}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineCancelText}>{t.timelineCanceled}</Text>
                </View>
              </View>
            )}
          </View>

          {shipment.status === 'pending' && (() => {
            const offers = shipment.offers ?? [];
            const pendingOffers = offers.filter(o =>
              o.status === 'pending' && o.driver !== null
            );
            return (
              <View style={styles.offerSection}>
                <Text style={[styles.offerSectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.driverOffers}
                </Text>

                <View style={styles.waitingBanner}>
                  <Ionicons name="timer-outline" size={18} color={colors.brand} />
                  <Text style={styles.waitingBannerText}>
                    {secondsLeft > 0
                      ? `${t.waitingTimer}: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
                      : t.raiseFarePrompt}
                  </Text>
                </View>

                {basePrice > 0 && (
                  <View style={styles.bidCard}>
                    <View style={[styles.bidRow, { flexDirection: rowDir }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bidLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {t.bidYourPrice}
                        </Text>
                        <Text style={[styles.bidHint, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {t.bidOriginal}: {basePrice.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {t.egp} • {t.bidDecreaseLeft}: {Math.max(0, 5 - decrements)}
                        </Text>
                      </View>
                      <CountUp
                        value={bid}
                        duration={320}
                        format={n =>
                          `${Math.round(n).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${t.egp}`
                        }
                        textProps={{ style: styles.bidValue, numberOfLines: 1 }}
                      />
                    </View>
                    <View style={[styles.bidControls, { flexDirection: rowDir }]}>
                      <HoldButton
                        onStep={decreaseBid}
                        disabled={decrements >= 5}
                        style={{ flex: 1 }}
                        contentStyle={[styles.bidBtn, decrements >= 5 && styles.bidBtnDisabled]}>
                        <Ionicons name="remove" size={18} color={decrements >= 5 ? colors.textLight : colors.dark} />
                        <Text style={[styles.bidBtnText, decrements >= 5 && { color: colors.textLight }]}>
                          {t.bidDecrease} 4%
                        </Text>
                      </HoldButton>
                      <HoldButton
                        onStep={increaseBid}
                        style={{ flex: 1 }}
                        contentStyle={[styles.bidBtn, styles.bidBtnActive]}>
                        <Ionicons name="add" size={18} color={colors.white} />
                        <Text style={[styles.bidBtnText, { color: colors.white }]}>
                          {t.bidIncrease} 4%
                        </Text>
                      </HoldButton>
                    </View>
                  </View>
                )}

                {pendingOffers.length === 0 ? (
                  <View style={styles.offerEmpty}>
                    <ActivityIndicator color={colors.textGray} size="small" />
                    <Text style={styles.offerEmptyText}>{t.waitingForDrivers}</Text>
                  </View>
                ) : (
                  pendingOffers.map(offer => (
                    <View key={offer.id} style={styles.offerCard}>
                      <View style={[styles.offerDriverRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                        <View style={styles.offerAvatar}>
                          <Text style={styles.offerAvatarText}>
                            {(offer.driver?.name ?? '?').trim().charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.offerDriverName, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {offer.driver?.name}
                          </Text>
                          <Text style={[styles.offerRating, { textAlign: isRTL ? 'right' : 'left' }]}>
                            ⭐ {offer.driver?.rating_avg.toFixed(1) ?? '—'} • {offer.driver?.vehicle_type ?? ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.offerAmountBox}>
                        <Text style={styles.offerAmountLabel}>{t.offerAmount}</Text>
                        <CountUp
                          value={offer.amount}
                          duration={420}
                          format={n =>
                            `${Math.round(n).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${t.egp}`
                          }
                          textProps={{ style: styles.offerAmountValue, numberOfLines: 1 }}
                        />
                      </View>

                      <View style={[styles.offerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <PressableScale
                          style={{ flex: 1 }}
                          contentStyle={styles.offerAcceptBtn}
                          pressedStyle={{ opacity: 0.9 }}
                          onPress={() => acceptOffer(offer.id)}>
                          <Text style={styles.offerAcceptText}>{t.acceptOffer}</Text>
                        </PressableScale>
                        <PressableScale
                          style={{ flex: 1 }}
                          contentStyle={styles.offerDeclineBtn}
                          pressedStyle={{ opacity: 0.9 }}
                          onPress={() => declineOffer(offer.id)}>
                          <Text style={styles.offerDeclineText}>{t.declineOffer}</Text>
                        </PressableScale>
                      </View>
                    </View>
                  ))
                )}

                {pendingOffers.length === 0 && (
                  <PressableScale onPress={simulateOffer} contentStyle={styles.devBtn}>
                    <Ionicons name="gift-outline" size={15} color={colors.textGray} />
                    <Text style={styles.devText}>{t.simulateDriverOffer}</Text>
                  </PressableScale>
                )}
              </View>
            );
          })()}

          {__DEV__ && !isDelivered && (
            <PressableScale onPress={advance} contentStyle={styles.devBtn}>
              <Ionicons name="play-forward" size={15} color={colors.textGray} />
              <Text style={styles.devText}>{t.simulateDev}</Text>
            </PressableScale>
          )}

          {(shipment.status === 'pending' || shipment.status === 'assigned') && (
            <AppButton
              title={t.cancelShipment}
              onPress={cancelShipment}
              variant="danger"
              style={{ marginTop: 10 }}
            />
          )}

          {!isDelivered && shipment.status === 'in_transit' ? (
            <AppButton
              title={t.confirmDelivery}
              onPress={() => router.push(`/confirm-delivery/${code}`)}
              style={{ marginTop: 10 }}
            />
          ) : isDelivered ? (
            <AppButton
              title={shipment.rating ? t.viewDetails : t.rateShipment}
              onPress={() => router.replace(`/success/${code}`)}
              style={{ marginTop: 10 }}
            />
          ) : null}
          </View>
        </Entrance>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  loadingStatus: { width: '100%' },
  loadingSheet: {
    marginTop: 'auto',
    width: '100%',
    gap: 12,
    paddingBottom: 24,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  liveWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
    backgroundColor: colors.card,
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
    backgroundColor: themeColors.dark,
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
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  timelineDotCurrent: {
    borderColor: colors.dark,
    borderWidth: 3,
  },
  timelineDotCancel: {
    borderColor: colors.red,
    borderWidth: 2,
    backgroundColor: colors.red,
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
  timelineLabelCanceled: {
    color: colors.textGray,
    textDecorationLine: 'line-through',
  },
  timelineCancelText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.red,
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
    color: colors.textGray,
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
  offerSection: {
    marginTop: 14,
    gap: 8,
  },
  offerSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.dark,
    marginBottom: 2,
  },
  waitingBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand + '12',
    borderWidth: 1,
    borderColor: colors.brand + '35',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waitingBannerText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.dark,
    textAlign: 'right',
  },
  offerEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 14,
  },
  offerEmptyText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textGray,
    flex: 1,
  },
  bidCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark + '33',
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
  },
  bidRow: {
    alignItems: 'center',
    gap: 10,
  },
  bidLabel: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.dark,
  },
  bidHint: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textGray,
    marginTop: 2,
  },
  bidValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.dark,
  },
  bidControls: {
    gap: 10,
  },
  bidBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.dark + '59',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  bidBtnActive: {
    backgroundColor: themeColors.dark,
    borderColor: themeColors.dark,
  },
  bidBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  bidBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.dark,
  },
  offerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  offerDriverRow: {
    alignItems: 'center',
    gap: 10,
  },
  offerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: themeColors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerAvatarText: {
    color: colors.white,
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
  offerDriverName: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.dark,
  },
  offerRating: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textGray,
    marginTop: 2,
  },
  offerAmountBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  offerAmountLabel: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textLight,
    marginBottom: 2,
  },
  offerAmountValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: colors.dark,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  offerAcceptBtn: {
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A7F4C',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  offerAcceptText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
  offerDeclineBtn: {
    height: 46,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerDeclineText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.red,
  },
});
