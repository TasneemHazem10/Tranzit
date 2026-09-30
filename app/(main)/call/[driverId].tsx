import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Entrance, PressableScale, Pulse } from '../../../src/components/Motion';
import IconButton from '../../../src/components/IconButton';
import { useLanguage } from '../../../src/store/language';
import { fonts, useTheme, type ThemeColors } from '../../../src/theme';

export default function CallScreen() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ driverId: string; driverName?: string }>();
  const { t } = useLanguage();
  const driverName = params.driverName ?? '';

  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [video, setVideo] = useState(false);
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnected(true), 2200);
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => {
      clearTimeout(connectTimer);
      clearInterval(interval);
    };
  }, []);

  const elapsed = () => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const control = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string | null,
    active: boolean,
    onPress: () => void
  ) => (
    <PressableScale onPress={onPress} contentStyle={styles.controlWrap} scaleTo={0.92}>
      <View style={[styles.control, active ? styles.controlActive : styles.controlIdle]}>
        <Ionicons
          name={icon}
          size={24}
          color={active ? colors.white : '#E8E8E6'}
        />
      </View>
      {label && <Text style={styles.controlLabel}>{label}</Text>}
    </PressableScale>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#1E1E1C', '#141413', '#33332F']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        <IconButton
          icon="chevron-down"
          size="md"
          variant="dark"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
        />
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.middle}>
        <View style={styles.avatarWrap}>
          {!connected && <Pulse color="rgba(255,255,255,0.35)" size={130} duration={1300} />}
          {!connected && <Pulse color="rgba(255,255,255,0.35)" size={130} duration={2100} />}
          {connected && <Pulse color="rgba(74,222,128,0.4)" size={130} duration={1800} />}
          <Entrance scaleFrom={0.5} distance={0} delay={60}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={56} color={colors.white} />
            </View>
          </Entrance>
        </View>
        <Entrance direction="up" delay={200}>
          <Text style={[styles.name, { fontFamily: fonts.extraBold, textAlign: 'center' }]}>{driverName}</Text>
        </Entrance>
        <Entrance direction="up" delay={260}>
          <Text style={[styles.state, { textAlign: 'center', fontFamily: fonts.medium }]}>
            {connected ? t.callInProgress : t.callConnecting}
          </Text>
        </Entrance>
        <Entrance direction="up" delay={320}>
          <Text style={[styles.timer, { fontFamily: fonts.semiBold }]}>{elapsed()}</Text>
        </Entrance>
      </View>

      <View style={styles.controls}>
        <Entrance direction="up" delay={380}>
          <View style={styles.controlsRow}>
            {control('mic', t.muteBtn, muted, () => setMuted(v => !v))}
            {control('volume-high', t.speakerBtn, speaker, () => setSpeaker(v => !v))}
            {control('videocam', t.videoBtn, video, () => setVideo(v => !v))}
          </View>
        </Entrance>
        <Entrance direction="up" delay={460}>
          <View style={styles.endWrap}>
            <PressableScale
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(main)'))}
              contentStyle={styles.endBtn}
              pressedStyle={{ opacity: 0.85 }}
              scaleTo={0.9}>
              <LinearGradient
                colors={['#FF4D4D', '#C91A13']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.endGradient}
              />
              <Ionicons name="call" size={28} color={colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
            </PressableScale>
            <Text style={styles.endLabel}>{t.endCall}</Text>
          </View>
        </Entrance>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1E1E1C',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  avatarWrap: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.darkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    color: colors.white,
  },
  state: {
    fontSize: 13.5,
    color: '#B9BAC9',
    marginTop: 8,
  },
  timer: {
    fontSize: 15,
    color: '#8E90A6',
    marginTop: 6,
  },
  controls: {
    paddingBottom: 34,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 34,
  },
  controlWrap: {
    alignItems: 'center',
    gap: 8,
  },
  control: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  controlIdle: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  controlLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#B9BAC9',
  },
  endWrap: {
    alignItems: 'center',
    gap: 8,
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C91A13',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: 'hidden',
  },
  endGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  endLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.white,
  },
});