import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Logo from './Logo';
import IconButton from './IconButton';
import AnimatedSwitch from './AnimatedSwitch';
import SegmentedControl from './SegmentedControl';
import { Entrance, PressableScale } from './Motion';
import { screenSpring } from './motion/presets';
import { useAuth } from '../store/auth';
import { useLanguage } from '../store/language';
import { useSettings } from '../store/settings';
import { useReducedMotion } from '../hooks/useMotion';
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fonts, radius, useTheme, type ThemeColors } from '../theme';

type MenuItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

type SettingsItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  sub: string;
  control: React.ReactNode;
};

export default function MenuOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { user, signOut } = useAuth();
  const { t, language, isRTL, setLanguage } = useLanguage();
  const { dark, notifications, setDark, setNotifications } = useSettings();
  const reduced = useReducedMotion();

  const [mounted, setMounted] = useState(visible);
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const panelX = useSharedValue(-380);
  const backdropOp = useSharedValue(0);
  const startX = useSharedValue(0);
  const width = useSharedValue(340);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setMounted(true), 12);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    panelX.value = withSpring(0, screenSpring);
    backdropOp.value = withTiming(1, { duration: 240 });
  }, [mounted, panelX, backdropOp]);

  useEffect(() => {
    if (visible || !mounted) return;
    panelX.value = withSpring(-width.value, screenSpring);
    backdropOp.value = withTiming(0, { duration: 170 });
    const t = setTimeout(() => setMounted(false), 210);
    return () => clearTimeout(t);
  }, [visible, mounted, panelX, backdropOp, width]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0) width.value = w;
    },
    [width]
  );

  const closeAnimated = useCallback(() => {
    panelX.value = withSpring(-width.value, screenSpring);
    backdropOp.value = withTiming(0, { duration: 170 });
    onCloseRef.current?.();
  }, [panelX, backdropOp, width]);

  const handleClose = useCallback(() => {
    if (reduced) {
      onCloseRef.current?.();
      return;
    }
    closeAnimated();
  }, [reduced, closeAnimated]);

  const pan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetX([14, -14])
    .onBegin(() => {
      startX.value = panelX.value;
    })
    .onUpdate(e => {
      panelX.value = clamp(startX.value + e.translationX, -width.value - 24, 0);
    })
    .onEnd(e => {
      if (e.velocityX > 650 || panelX.value < -width.value * 0.3) {
        runOnJS(handleClose)();
      } else {
        panelX.value = withSpring(0, screenSpring);
        backdropOp.value = withTiming(1, { duration: 220 });
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panelX.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

  const go = (fn: () => void) => {
    closeAnimated();
    setTimeout(fn, 170);
  };

  const items: MenuItem[] = [
    {
      key: 'home',
      icon: 'home-outline',
      label: t.menuHome,
      onPress: () => go(() => router.replace('/')),
    },
    {
      key: 'trips',
      icon: 'file-tray-full-outline',
      label: t.menuTrips,
      onPress: () => go(() => router.push('/history' as never)),
    },
    {
      key: 'profile',
      icon: 'person-outline',
      label: t.menuProfile,
      onPress: () => go(() => router.push('/profile' as never)),
    },
    {
      key: 'settings',
      icon: 'settings-outline',
      label: t.menuSettings,
      onPress: () => setView('settings'),
    },
    {
      key: 'logout',
      icon: 'log-out-outline',
      label: t.logout,
      danger: true,
      onPress: () =>
        go(async () => {
          await signOut();
          router.replace('/login');
        }),
    },
  ];

  const settingsItems: SettingsItem[] = [
    {
      key: 'dark',
      icon: 'moon-outline',
      tint: colors.purple,
      title: t.settingsDarkMode,
      sub: t.settingsDarkModeSub,
      control: <AnimatedSwitch value={dark} onValueChange={setDark} />,
    },
    {
      key: 'language',
      icon: 'language-outline',
      tint: colors.green,
      title: t.settingsLanguage,
      sub: t.settingsLanguageSub,
      control: (
        <SegmentedControl<'ar' | 'en'>
          options={[
            { label: t.settingsLangAr, value: 'ar' },
            { label: t.settingsLangEn, value: 'en' },
          ]}
          value={language}
          onChange={setLanguage}
        />
      ),
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      tint: colors.brand,
      title: t.settingsNotifications,
      sub: t.settingsNotificationsSub,
      control: <AnimatedSwitch value={notifications} onValueChange={setNotifications} />,
    },
  ];

  if (!mounted) return null;

  const entering = reduced ? undefined : FadeIn.duration(220);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdropTouch} onPress={handleClose}>
          <Animated.View pointerEvents="none" style={[styles.backdropFill, backdropStyle]} />
        </Pressable>
        <GestureDetector gesture={pan}>
          <Animated.View onLayout={onLayout} style={[styles.panel, { backgroundColor: colors.background }, panelStyle]}>
            <SafeAreaView style={styles.safe} edges={['top']}>
              <View style={styles.brandRow}>
                <Logo width={108} variant={dark ? 'white' : 'dark'} />
                <IconButton icon="close" size="md" variant="light" onPress={handleClose} />
              </View>

              {user && (
                <Entrance direction="left" distance={22}>
                  <LinearGradient
                    colors={dark ? [colors.card, colors.background] : [colors.white, colors.background]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.userRow, { borderColor: colors.divider }]}>
                    <LinearGradient
                      colors={[colors.brand, colors.brandDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(user.name || '?').trim().charAt(0)}
                      </Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: colors.dark }]}>{user.name}</Text>
                      <Text style={[styles.userPhone, { color: colors.textGray }]}>{user.phone}</Text>
                    </View>
                  </LinearGradient>
                </Entrance>
              )}

              {view === 'menu' ? (
                <Animated.View key="menu" entering={entering}>
                  <View style={styles.menuList}>
                    {items.map((item, i) => (
                      <Entrance key={item.key} direction="left" distance={24} delay={140 + i * 55}>
                        <PressableScale
                          onPress={item.onPress}
                          contentStyle={[styles.menuItem, item.danger && { backgroundColor: colors.red + '0F' }]}
                          pressedStyle={{ opacity: 0.6 }}>
                          <View style={[styles.menuIcon, { backgroundColor: colors.card, borderColor: colors.divider }, item.danger && { backgroundColor: colors.red + '14', borderColor: colors.red + '33' }]}>
                            <Ionicons
                              name={item.icon}
                              size={19}
                              color={item.danger ? colors.red : colors.dark}
                            />
                          </View>
                          <Text style={[styles.menuLabel, { color: colors.dark }, item.danger && { color: colors.red }]}>
                            {item.label}
                          </Text>
                        </PressableScale>
                      </Entrance>
                    ))}
                  </View>
                </Animated.View>
              ) : (
                <Animated.View key={`settings-${language}`} entering={entering}>
                  <PressableScale
                    onPress={() => setView('menu')}
                    contentStyle={styles.backRow}
                    pressedStyle={{ opacity: 0.6 }}>
                    <Ionicons
                      name={isRTL ? 'chevron-forward' : 'chevron-back'}
                      size={18}
                      color={colors.textGray}
                    />
                    <Text style={[styles.backLabel, { color: colors.textGray }]}>{t.settingsBack}</Text>
                  </PressableScale>

                  <Entrance direction="up" distance={14}>
                    <Text style={styles.settingsTitle}>{t.settingsTitle}</Text>
                  </Entrance>

                  <Text style={[styles.sectionTitle, { color: colors.textGray }]}>
                    {t.settingsSectionGeneral}
                  </Text>

                  <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
                    {settingsItems.map((item, i) => (
                      <Entrance key={item.key} direction="left" distance={22} delay={80 + i * 70}>
                        <View
                          style={[
                            styles.settingsRow,
                            i !== settingsItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                          ]}>
                          <View style={[styles.settingsIcon, { backgroundColor: item.tint + '1A' }]}>
                            <Ionicons name={item.icon} size={18} color={item.tint} />
                          </View>
                          <View style={styles.settingsText}>
                            <Text style={[styles.settingsRowTitle, { color: colors.dark }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.settingsRowSub, { color: colors.textGray }]} numberOfLines={1}>
                              {item.sub}
                            </Text>
                          </View>
                          <View style={styles.settingsControl}>{item.control}</View>
                        </View>
                      </Entrance>
                    ))}
                  </View>

                  <Text style={[styles.settingsHint, { color: colors.textLight }]}>
                    TRANZET v1.0.0
                  </Text>
                </Animated.View>
              )}
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    backdropTouch: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    backdropFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    panel: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '82%',
      maxWidth: 340,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 6, height: 0 },
      elevation: 16,
    },
    safe: { flex: 1, paddingHorizontal: 18 },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      marginBottom: 18,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: 12,
      marginBottom: 18,
    },
    userAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userAvatarText: {
      color: '#FFFFFF',
      fontFamily: fonts.extraBold,
      fontSize: 18,
    },
    userName: {
      fontFamily: fonts.bold,
      fontSize: 15,
    },
    userPhone: {
      fontFamily: fonts.medium,
      fontSize: 12.5,
      marginTop: 2,
    },
    menuList: { gap: 6 },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: radius.lg,
    },
    menuIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    menuLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 2,
      marginBottom: 10,
    },
    backLabel: {
      fontFamily: fonts.semiBold,
      fontSize: 13.5,
    },
    settingsTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      color: colors.dark,
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 12.5,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    settingsCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    settingsIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsText: { flex: 1 },
    settingsRowTitle: {
      fontFamily: fonts.bold,
      fontSize: 14,
    },
    settingsRowSub: {
      fontFamily: fonts.medium,
      fontSize: 11.5,
      marginTop: 1,
    },
    settingsControl: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      maxWidth: 170,
    },
    settingsHint: {
      fontFamily: fonts.medium,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 26,
    },
  });