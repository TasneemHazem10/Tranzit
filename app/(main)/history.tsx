import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { shipmentsApi, type Shipment } from '../../src/api/endpoints';
import { useAuth } from '../../src/store/auth';
import { useLanguage } from '../../src/store/language';
import { Entrance, PressableScale, Skeleton } from '../../src/components/Motion';
import { spring } from '../../src/components/motion/presets';
import IconButton from '../../src/components/IconButton';
import { colors as themeColors, fonts, radius, useTheme, type ThemeColors } from '../../src/theme';

type Tab = 'active' | 'completed' | 'canceled';

const STATUS_MAP: Record<string, string> = {
  pending: 'statusPending',
  assigned: 'statusAssigned',
  picked_up: 'statusPickedUp',
  in_transit: 'statusInTransit',
  delivered: 'statusDelivered',
  canceled: 'statusCanceled',
};

const STATUS_COLORS: Record<string, string> = {
  pending: themeColors.orange,
  assigned: themeColors.brand,
  picked_up: themeColors.brandDeep,
  in_transit: themeColors.brand,
  delivered: themeColors.green,
  canceled: themeColors.red,
};

const TAB_STATUS: Record<Tab, (s: Shipment) => boolean> = {
  active: s => s.status !== 'delivered' && s.status !== 'canceled',
  completed: s => s.status === 'delivered',
  canceled: s => s.status === 'canceled',
};

const { width } = Dimensions.get('window');
const TAB_GAP = 8;

function TabButton({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const pill = useSharedValue(0);

  useEffect(() => {
    pill.value = withSpring(active ? 1 : 0, spring.toggle);
  }, [active, pill]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pill.value, [0, 1], ['#F3F1EE', colors.dark]),
    transform: [{ scale: interpolate(pill.value, [0, 1], [0.92, 1]) }],
    shadowOpacity: pill.value * 0.25,
    shadowRadius: pill.value * 10,
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(pill.value, [0, 1], [colors.textGray, colors.white]),
  }));

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={[styles.tab, pillStyle]}>
        <Ionicons name={icon} size={15} color={active ? colors.white : colors.textGray} />
        <Animated.Text style={[styles.tabText, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

function HistoryRow({
  item,
  index,
  onPress,
}: {
  item: Shipment;
  index: number;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t, isRTL } = useLanguage();
  const rowDir = isRTL ? ('row-reverse' as const) : ('row' as const);
  const statusColor = STATUS_COLORS[item.status] ?? colors.textGray;

  return (
    <Entrance delay={Math.min(index * 70, 520)} distance={22}>
      <PressableScale
        onPress={onPress}
        style={styles.row}
        contentStyle={{ flexDirection: rowDir, alignItems: 'center', gap: 12 }}>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>#{item.tracking_code.slice(-4).toUpperCase()}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowAddress, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {item.dropoff_address || item.pickup_address}
          </Text>
          <Text style={[styles.rowMeta, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t.activeChipSub}{item.tracking_code} ● {new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
          </Text>
        </View>
        <View style={styles.rowEnd}>
          <Text style={[styles.rowPrice, { textAlign: 'right' }]}>{item.price} {t.egp}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.rowStatus, { color: statusColor, textAlign: 'right' }]}>
              {t[STATUS_MAP[item.status] as keyof typeof t] ?? item.status}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
      </PressableScale>
    </Entrance>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { token } = useAuth();
  const { t, isRTL } = useLanguage();
  const [tab, setTab] = useState<Tab>('active');
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await shipmentsApi.list(token);
      setShipments(res.shipments);
    } catch {
      setShipments([]);
    }
  }, [token]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await shipmentsApi.list(token);
      setShipments(res.shipments);
    } catch {
      setShipments([]);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'active', label: t.historyActive, icon: 'timer-outline' },
    { key: 'completed', label: t.historyCompleted, icon: 'checkmark-circle-outline' },
    { key: 'canceled', label: t.historyCanceled, icon: 'close-circle-outline' },
  ];

  const filtered = (shipments ?? []).filter(TAB_STATUS[tab]);

  return (
    <SafeAreaView style={styles.safe}>
      <Entrance direction="down" distance={14} style={styles.headerRow}>
        <IconButton
          icon={isRTL ? 'chevron-back' : 'chevron-forward'}
          variant="light"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
        />
        <Text style={styles.headerTitle}>{t.historyTitle}</Text>
        <View style={{ width: 38 }} />
      </Entrance>

      <View style={[styles.tabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {tabs.map(tb => (
          <TabButton
            key={tb.key}
            active={tab === tb.key}
            label={tb.label}
            icon={tb.icon}
            onPress={() => setTab(tb.key)}
          />
        ))}
      </View>

      {shipments === null ? (
        <View style={styles.skeletonBlock}>
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} height={78} radius={radius.md} style={styles.skeletonRow} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshing={refreshing}
          onRefresh={refresh}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />
          }
          renderItem={({ item, index }) => (
            <HistoryRow
              item={item}
              index={index}
              onPress={() => router.push(`/track/${item.tracking_code}`)}
            />
          )}
          ListEmptyComponent={
            <Entrance delay={120}>
              <View style={styles.empty}>
                <PressableScale style={styles.emptyIcon}>
                  <Ionicons name="file-tray-full-outline" size={34} color={colors.dark} />
                </PressableScale>
                <Text style={[styles.emptyTitle, { textAlign: 'center' }]}>{t.historyEmpty}</Text>
                <Text style={[styles.emptySub, { textAlign: 'center' }]}>{t.historyEmptySub}</Text>
              </View>
            </Entrance>
          }
        />
      )}
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
    fontSize: 17,
    color: colors.dark,
  },
  tabs: {
    marginHorizontal: 16,
    gap: TAB_GAP,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexDirection: 'row',
    elevation: 0,
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  tabText: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
  },
  row: {
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
    backgroundColor: themeColors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.white,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowAddress: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.dark,
  },
  rowMeta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textGray,
    marginTop: 3,
  },
  rowEnd: {
    alignItems: 'flex-end',
  },
  rowPrice: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.dark,
  },
  rowStatus: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    marginTop: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 3,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.textGray,
  },
  emptySub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
  },
  skeletonBlock: {
    padding: 16,
    gap: 10,
  },
  skeletonRow: {
    width: width - 32,
  },
});