import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { request } from '../../../src/api/client';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

type Message = {
  id: number;
  body: string;
  is_from_driver: boolean;
  created_at: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const { driverId, driverName } = useLocalSearchParams<{ driverId: string; driverName: string }>();
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!token || !driverId) return;
    try {
      const res = await request<{ messages: Message[] }>(`/api/v1/messages/${driverId}`, { token });
      setMessages(res.messages);
    } catch {} finally {
      setLoading(false);
    }
  }, [token, driverId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body || !token || !driverId) return;
    setText('');
    try {
      const res = await request<{ message: Message }>(`/api/v1/messages/${driverId}`, {
        method: 'POST',
        body: { body },
        token,
      });
      setMessages(prev => [...prev, res.message]);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.dark} />
        </Pressable>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>{driverName?.charAt(0) ?? '?'}</Text>
        </View>
        <Text style={styles.headerTitle}>{driverName}</Text>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.is_from_driver ? styles.bubbleDriver : styles.bubbleUser]}>
              <Text style={[styles.bubbleText, item.is_from_driver && styles.bubbleTextDriver]}>
                {item.body}
              </Text>
              <Text style={[styles.bubbleTime, item.is_from_driver && styles.bubbleTimeDriver]}>
                {new Date(item.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
                <Text style={styles.emptyText}>ابدأ المحادثة مع السائق</Text>
              </View>
            )
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.textLight}
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
            textAlign="right"
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  avatarSmall: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.dark },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 8,
  },
  bubbleUser: {
    backgroundColor: colors.dark,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 4,
  },
  bubbleDriver: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  bubbleText: { fontFamily: fonts.medium, fontSize: 14, color: colors.white, textAlign: 'right', lineHeight: 22 },
  bubbleTextDriver: { color: colors.dark },
  bubbleTime: { fontFamily: fonts.regular, fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 4 },
  bubbleTimeDriver: { color: colors.textLight },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.dark,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.dark, alignItems: 'center', justifyContent: 'center',
  },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textLight, marginTop: 12 },
});
