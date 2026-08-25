import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Signature from 'react-native-signature-canvas';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../../src/components/AppButton';
import { shipmentsApi } from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { colors, fonts, radius } from '../../../src/theme';

export default function ConfirmDelivery() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token } = useAuth();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [sigModal, setSigModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const result = await (perm.granted
      ? ImagePicker.launchCameraAsync({ quality: 0.7 })
      : Promise.resolve(ImagePicker.launchImageLibraryAsync({ quality: 0.7 }))
    ).then(r => r as ImagePicker.ImagePickerResult);

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      // RN FormData file shape
      if (photoUri) {
        form.append('proof_photo', {
          uri: photoUri,
          name: 'proof.jpg',
          type: 'image/jpeg',
        } as never);
      }
      if (signatureData) {
        form.append('signature_image', {
          uri: signatureData,
          name: 'signature.png',
          type: 'image/png',
        } as never);
      }
      await shipmentsApi.confirmDelivery(token!, code!, form);
      router.replace(`/success/${code}`);
    } catch (e: any) {
      Alert.alert('تنبيه', e?.message ?? 'تعذر تأكيد التسليم.');
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
        <Text style={styles.title}>تأكيد التسليم</Text>
        <View style={{ width: 38 }} />
      </View>
      <Text style={styles.orderNote}>رقم الطلب #{code}</Text>

      {/* Proof of delivery */}
      <Text style={styles.section}>إثبات التسليم</Text>
      <Pressable style={styles.dropBox} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={[StyleSheet.absoluteFill, styles.preview]} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={34} color={colors.textLight} />
            <Text style={styles.dropText}>اضغط لتصوير الشحنة المُسلَّمة</Text>
          </>
        )}
        {photoUri && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        )}
      </Pressable>

      {/* Signature */}
      <Text style={styles.section}>الحصول على توقيع</Text>
      <Pressable style={styles.dropBox} onPress={() => setSigModal(true)}>
        {signatureData ? (
          <>
            <Image source={{ uri: signatureData }} style={styles.sigPreview} resizeMode="contain" />
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          </>
        ) : (
          <>
            <Ionicons name="create-outline" size={34} color={colors.textLight} />
            <Text style={styles.dropText}>اضغط للحصول على توقيع المستلم</Text>
          </>
        )}
      </Pressable>

      <View style={{ flex: 1 }} />

      <AppButton title="تأكيد التسليم" onPress={submit} loading={loading} style={{ marginBottom: 20 }} />

      <Modal visible={sigModal} animationType="slide">
        <SafeAreaView style={styles.sigModal}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => setSigModal(false)}
              style={styles.backBtn}>
              <Ionicons name="close" size={22} color={colors.dark} />
            </Pressable>
            <Text style={styles.title}>توقيع المستلم</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={styles.sigPadWrap}>
            <Signature
              onOK={data => {
                setSignatureData(data);
                setSigModal(false);
              }}
              onEmpty={() => Alert.alert('تنبيه', 'لم تقم بالتوقيع بعد.')}
              descriptionText="وقّع داخل الإطار"
              clearText="مسح"
              confirmText="تأكيد"
              penColor="#1E1E1C"
              backgroundColor="#F5F5F4"
              autoClear
              webStyle={`${padStyle}`}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const padStyle = `
.pad {
  width: 100%;
  height: 100%;
  border: none;
}`;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: colors.dark,
  },
  orderNote: {
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: 6,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.dark,
    marginTop: 22,
    marginBottom: 10,
    textAlign: 'right',
  },
  dropBox: {
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  dropText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textLight,
  },
  preview: {
    borderRadius: radius.lg - 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigPreview: {
    width: '100%',
    height: 130,
  },
  sigModal: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
  },
  sigPadWrap: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 30,
  },
});
