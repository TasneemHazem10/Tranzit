import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import { request } from '../../../src/api/client';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function AddFundsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      Alert.alert('تنبيه', 'أدخل مبلغ صحيح.');
      return;
    }
    setLoading(true);
    try {
      await request('/api/v1/wallet/topup', {
        method: 'POST',
        body: { amount: val },
        token,
      });
      Alert.alert('تم بنجاح', `تم إضافة ${val.toLocaleString('ar-EG')} جنيه إلى محفظتك.`, [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('تنبيه', e?.message ?? 'تعذر إضافة الرصيد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.dark} />
        </Pressable>
        <Text style={styles.headerTitle}>إضافة رصيد</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>المبلغ</Text>
        <View style={styles.amountInput}>
          <TextInput
            style={styles.amountText}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            textAlign="center"
          />
          <Text style={styles.currency}>جنيه</Text>
        </View>

        <Text style={styles.label}>مبالغ سريعة</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map(q => (
            <Pressable
              key={q}
              style={[styles.quickBtn, amount === String(q) && styles.quickBtnActive]}
              onPress={() => setAmount(String(q))}>
              <Text style={[styles.quickText, amount === String(q) && styles.quickTextActive]}>
                {q.toLocaleString('ar-EG')}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <AppButton
          title="إضافة الرصيد"
          onPress={submit}
          loading={loading}
          disabled={!amount || parseFloat(amount) <= 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.divider,
  },
  headerTitle: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.dark },
  body: { flex: 1, padding: 24 },
  label: { fontFamily: fonts.bold, fontSize: 14.5, color: colors.dark, textAlign: 'right', marginBottom: 8, marginTop: 16 },
  amountInput: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    height: 70, gap: 8,
  },
  amountText: { fontFamily: fonts.black, fontSize: 32, color: colors.dark, flex: 1 },
  currency: { fontFamily: fonts.bold, fontSize: 16, color: colors.textGray, marginRight: 16 },
  quickRow: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  quickBtn: {
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
  },
  quickBtnActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  quickText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.dark },
  quickTextActive: { color: colors.white },
});
