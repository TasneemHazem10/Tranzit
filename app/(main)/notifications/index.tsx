import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { request } from '../../../src/api/client';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

type Notif = {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, string> = {
  shipment: 'cube-outline',
  system: 'information-circle-outline',
  payment: 'wallet-outline',
  general: 'notifications-outline',
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await request<{ notifications: Notif[] }>('/api/v1/notifications', { token });
      setNotifications(res.notifications);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: number) => {
    if (!token) return;
    try {
      await request(`/api/v1/notifications/${id}/read`, { method: 'POST', token });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>الإشعارات</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.dark} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => String(n.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
              <Text style={styles.emptySub}>ستظهر هنا أي تحديثات أو رسائل جديدة</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.notifCard, !item.is_read && styles.notifCardUnread]}
              onPress={() => markRead(item.id)}>
              <View style={[styles.notifIcon, { backgroundColor: colors.orange + '18' }]}>
                <Ionicons name={(TYPE_ICONS[item.type] ?? 'notifications-outline') as any} size={22} color={colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
              </View>
              {!item.is_read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 18, color: colors.dark },
  notifCard: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.divider,
  },
  notifCardUnread: { borderColor: colors.orange + '60', backgroundColor: colors.orange + '08' },
  notifIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.dark, textAlign: 'right' },
  notifBody: { fontFamily: fonts.medium, fontSize: 13, color: colors.textGray, textAlign: 'right', marginTop: 4, lineHeight: 20 },
  notifTime: { fontFamily: fonts.regular, fontSize: 11, color: colors.textLight, textAlign: 'right', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange, marginTop: 6 },
  emptyWrap: { alignItems: 'center', paddingVertical: 80 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.divider + '60',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.dark },
  emptySub: { fontFamily: fonts.medium, fontSize: 13, color: colors.textGray, marginTop: 6, textAlign: 'center' },
});
