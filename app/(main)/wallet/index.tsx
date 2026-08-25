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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { request } from '../../../src/api/client';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

type Tx = {
  id: number;
  type: string;
  amount: string;
  description: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  topup: 'إضافة رصيد',
  payment: 'دفع',
  refund: 'استرداد',
};

const TYPE_COLORS: Record<string, string> = {
  topup: colors.green,
  payment: colors.red,
  refund: colors.orange,
};

export default function WalletScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await request<{ balance: number; transactions: Tx[] }>('/api/v1/wallet', { token });
      setBalance(res.balance);
      setTransactions(res.transactions);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>المحفظة</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.dark} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>الرصيد الحالي</Text>
            <Text style={styles.balanceValue}>{balance.toLocaleString('ar-EG')} جنيه</Text>
            <Pressable
              style={styles.topupBtn}
              onPress={() => router.push('/wallet/add-funds')}>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.topupText}>إضافة رصيد</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>سجل المعاملات</Text>

          <FlatList
            data={transactions}
            keyExtractor={tx => String(tx.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="receipt-outline" size={48} color={colors.border} />
                <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: (TYPE_COLORS[item.type] ?? colors.border) + '22' }]}>
                  <Ionicons
                    name={item.type === 'topup' ? 'add-circle' : item.type === 'refund' ? 'refresh-circle' : 'remove-circle'}
                    size={20}
                    color={TYPE_COLORS[item.type] ?? colors.border}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{TYPE_LABELS[item.type] ?? item.type}</Text>
                  <Text style={styles.txDesc}>{item.description ?? '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txAmount, { color: item.type === 'topup' || item.type === 'refund' ? colors.green : colors.red }]}>
                    {item.type === 'topup' || item.type === 'refund' ? '+' : '-'}{Number(item.amount).toLocaleString('ar-EG')} ج
                  </Text>
                  <Text style={styles.txDate}>{new Date(item.created_at).toLocaleDateString('ar-EG')}</Text>
                </View>
              </View>
            )}
          />
        </>
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
  balanceCard: {
    backgroundColor: colors.dark, borderRadius: radius.xl, padding: 24, marginHorizontal: 16, marginTop: 8,
    alignItems: 'center',
  },
  balanceLabel: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { fontFamily: fonts.black, fontSize: 32, color: colors.white, marginVertical: 8 },
  topupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.orange, borderRadius: radius.full,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  topupText: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  sectionTitle: {
    fontFamily: fonts.bold, fontSize: 15, color: colors.dark,
    paddingHorizontal: 16, marginTop: 24, marginBottom: 4, textAlign: 'right',
  },
  txRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.divider,
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.dark, textAlign: 'right' },
  txDesc: { fontFamily: fonts.medium, fontSize: 12, color: colors.textGray, textAlign: 'right', marginTop: 2 },
  txAmount: { fontFamily: fonts.bold, fontSize: 14 },
  txDate: { fontFamily: fonts.regular, fontSize: 11, color: colors.textLight, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textLight, marginTop: 12 },
});
