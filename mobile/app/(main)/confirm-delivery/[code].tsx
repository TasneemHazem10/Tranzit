import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
import IconButton from '../../../src/components/IconButton';
import { Entrance, PressableScale } from '../../../src/components/Motion';
import { shipmentsApi } from '../../../src/api/endpoints';
import { useAuth } from '../../../src/store/auth';
import { useLanguage } from '../../../src/store/language';
import { fonts, radius, useTheme, type ThemeColors } from '../../../src/theme';

export default function ConfirmDelivery() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { code } = useLocalSearchParams<{ code: string }>();
  const { token } = useAuth();
  const { t, isRTL } = useLanguage();

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
      Alert.alert(t.alertWarning, e?.message ?? t.alertErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Entrance direction="down" distance={12}>
        <View style={styles.headerRow}>
          <IconButton
            icon={isRTL ? 'chevron-back' : 'chevron-forward'}
            variant="light"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
          />
          <Text style={styles.title}>{t.confirmDeliveryTitle}</Text>
          <View style={{ width: 38 }} />
        </View>
      </Entrance>
      <Text style={styles.orderNote}>{t.orderId}#{code}</Text>

      {/* Proof of delivery */}
      <Text style={styles.section}>{t.proofTitle}</Text>
      <Entrance direction="up" delay={120}>
        <PressableScale onPress={pickPhoto} contentStyle={styles.dropBox} pressedStyle={styles.dropBoxPressed}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={[StyleSheet.absoluteFill, styles.preview]} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={34} color={colors.textLight} />
              <Text style={styles.dropText}>{t.proofCapture}</Text>
            </>
          )}
          {photoUri && (
            <View style={[styles.checkBadge, isRTL ? { right: 10 } : { left: 10 }]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          )}
        </PressableScale>
      </Entrance>

      {/* Signature */}
      <Text style={styles.section}>{t.signatureTitle}</Text>
      <Entrance direction="up" delay={220}>
        <PressableScale onPress={() => setSigModal(true)} contentStyle={styles.dropBox} pressedStyle={styles.dropBoxPressed}>
          {signatureData ? (
            <>
              <Image source={{ uri: signatureData }} style={styles.sigPreview} resizeMode="contain" />
              <View style={[styles.checkBadge, isRTL ? { right: 10 } : { left: 10 }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </>
          ) : (
            <>
              <Ionicons name="create-outline" size={34} color={colors.textLight} />
              <Text style={styles.dropText}>{t.signatureTap}</Text>
            </>
          )}
        </PressableScale>
      </Entrance>

      <View style={{ flex: 1 }} />

      <AppButton title={t.submitDelivery} onPress={submit} loading={loading} style={{ marginBottom: 20 }} />

      <Modal visible={sigModal} animationType="slide">
        <SafeAreaView style={styles.sigModal}>
          <View style={styles.headerRow}>
            <IconButton icon="close" variant="light" onPress={() => setSigModal(false)} />
            <Text style={styles.title}>{t.signatureModalTitle}</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={styles.sigPadWrap}>
            <Signature
              onOK={data => {
                setSignatureData(data);
                setSigModal(false);
              }}
              onEmpty={() => Alert.alert(t.alertWarning, t.alertSignatureEmpty)}
              descriptionText={t.signaturePadText}
              clearText={t.signatureClear}
              confirmText={t.signatureConfirm}
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
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
  dropBoxPressed: {
    borderColor: colors.brand,
    backgroundColor: colors.brand + '0A',
  },
  preview: {
    borderRadius: radius.lg - 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
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
    backgroundColor: colors.card,
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
