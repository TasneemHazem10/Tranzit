import React, { useEffect } from 'react';
import { Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, type ThemeColors } from '../../theme';

const { width: W } = Dimensions.get('window');
const SCENE = Math.min(W - 88, 300);
const BOX = 46;
const roadRadius = 8;

type SceneProps = { active: boolean; accent: string };

/** A single gentle floating loop for decorative elements. */
function Bob({
  active,
  amount = 9,
  duration = 2600,
  children,
  style,
}: {
  active: boolean;
  amount?: number;
  duration?: number;
  children: React.ReactNode;
  style?: object;
}) {
  const y = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      y.value = 0;
      cancelAnimation(y);
      return;
    }
    y.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(y);
  }, [active, amount, duration, y]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [0, 1], [amount, -amount]) }],
  }));

  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}

/** Expanding ping ring, staggered for radar / location effects. */
function Ping({
  active,
  color,
  size,
  delay,
  duration = 2100,
}: {
  active: boolean;
  color: string;
  size: number;
  delay?: number;
  duration?: number;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const p = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      p.value = 0;
      cancelAnimation(p);
      return;
    }
    p.value = withDelay(
      delay ?? 0,
      withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false)
    );
    return () => cancelAnimation(p);
  }, [active, color, delay, duration, p]);

  const style = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: color,
    opacity: 0.7 * (1 - p.value),
    transform: [{ scale: 0.4 + 1.5 * p.value }],
  }));

  if (!active) return null;
  return <Animated.View style={[styles.ping, style]} />;
}

/** A dashed segment row that tiles seamlessly while shifting. */
function DashRow({
  shift,
  length,
  segment = 14,
  gap = 20,
  color,
  horizontal = true,
}: {
  shift: SharedValue<number>;
  length: number;
  segment?: number;
  gap?: number;
  color: string;
  horizontal?: boolean;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const step = segment + gap;
  const count = Math.ceil((length * 2) / step) + 2;

  const style = useAnimatedStyle(() => ({
    transform: [
      horizontal
        ? { translateX: interpolate(shift.value, [0, 1], [-length, 0]) }
        : { translateY: interpolate(shift.value, [0, 1], [-length, 0]) },
    ],
  }));

  return (
    <View style={styles.dashRow} pointerEvents="none">
      <Animated.View style={[styles.dashRowInner, { width: length * 2, height: 4 }, style]}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            style={[
              horizontal ? styles.dashSegH : styles.dashSegV,
              {
                backgroundColor: color,
                width: horizontal ? segment : 4,
                height: horizontal ? 4 : segment,
                marginRight: horizontal ? gap : 0,
                marginBottom: horizontal ? 0 : gap,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Map pin with an optional pulsing ring. */
function Pin({
  color,
  size = 26,
  active,
  ring = true,
}: {
  color: string;
  size?: number;
  active: boolean;
  ring?: boolean;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ring && <Ping active={active} color={color} size={size * 1.9} duration={1800} />}
      <View
        style={[
          styles.pinHead,
          {
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.31,
            backgroundColor: color,
            borderColor: colors.white,
            borderWidth: 2.5,
          },
        ]}
      />
    </View>
  );
}

/** Slide 1 — request: shipping map card with pickup › route › delivery. */
function RequestScene({ active, accent }: SceneProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useSharedValue(0);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      t.value = 0;
      shift.value = 0;
      cancelAnimation(t);
      cancelAnimation(shift);
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true);
    shift.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(t);
      cancelAnimation(shift);
    };
  }, [active, t, shift]);

  const from = { x: SCENE * 0.18, y: SCENE * 0.28 };
  const to = { x: SCENE * 0.8, y: SCENE * 0.7 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const boxStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: interpolate(t.value, [0, 1], [from.x - BOX / 2, to.x - BOX / 2]),
    top: interpolate(t.value, [0, 1], [from.y - BOX / 2, to.y - BOX / 2]),
    transform: [
      { rotate: `${interpolate(t.value, [0, 1], [-10, 10])}deg` },
      { scale: interpolate(t.value, [0, 1], [1, 1.08]) },
    ],
  }));

  const roadW = SCENE * 0.76;
  const roadH = 16;

  return (
    <View style={styles.stage}>
      <View style={styles.card}>
        <LinearGradient
          colors={[`${accent}10`, `${accent}05`, colors.background]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {[0.25, 0.5, 0.75].map(i => (
          <View key={`h-${i}`} style={[styles.gridH, { top: i * SCENE }]} />
        ))}
        {[0.25, 0.5, 0.75].map(i => (
          <View key={`v-${i}`} style={[styles.gridV, { left: i * SCENE }]} />
        ))}

        <View
          pointerEvents="none"
          style={[
            styles.routeBand,
            {
              width: dist,
              left: from.x + dx / 2 - dist / 2,
              top: from.y + dy / 2 - 2,
              transform: [{ rotate: `${angle}deg` }],
            },
          ]}>
          <DashRow shift={shift} length={dist} color={`${accent}8C`} segment={12} gap={26} />
        </View>

        <Bob active={active} amount={7} duration={2600} style={[styles.pinSlot, { left: from.x - 13, top: from.y - 13 }]}>
          <Pin color={colors.brand} size={26} active={active} />
        </Bob>
        <Bob active={active} amount={7} duration={2900} style={[styles.pinSlot, { left: to.x - 13, top: to.y - 13 }]}>
          <Pin color={colors.green} size={26} active={active} />
        </Bob>

        <Animated.View style={[styles.box, boxStyle]}>
          <LinearGradient
            colors={[colors.brand, colors.brandDeep]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.boxLid} />
          <View style={styles.boxTape} />
        </Animated.View>

        <View style={[styles.road, { left: SCENE * 0.12, right: SCENE * 0.12, bottom: SCENE * 0.08, height: roadH }]}>
          <View style={styles.roadMask}>
            <DashRow shift={shift} length={roadW} color={colors.white} segment={18} gap={34} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Slide 2 — real-time tracking radar with orbiting dot. */
function TrackScene({ active, accent }: SceneProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      rot.value = 0;
      cancelAnimation(rot);
      return;
    }
    rot.value = withRepeat(withTiming(360, { duration: 3800, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [active, rot]);

  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const radar = SCENE * 0.84;

  return (
    <View style={styles.stage}>
      <View style={[styles.radarCard, { width: SCENE, height: SCENE, borderRadius: SCENE / 2 }]}>
        <LinearGradient
          colors={[`${accent}18`, `${accent}08`, colors.background]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.ring, { width: radar, height: radar, borderRadius: radar / 2, borderColor: `${accent}2E` }]} />
        <View style={[styles.ring, { width: radar * 0.72, height: radar * 0.72, borderRadius: radar * 0.36, borderColor: `${accent}33` }]} />
        <View style={[styles.ring, { width: radar * 0.44, height: radar * 0.44, borderRadius: radar * 0.22, borderColor: `${accent}26` }]} />

        <View style={[styles.radarCrossH, { borderColor: `${accent}30` }]} />
        <View style={[styles.radarCrossV, { borderColor: `${accent}30` }]} />

        <Ping active={active} color={accent} size={radar * 0.26} delay={0} />
        <Ping active={active} color={accent} size={radar * 0.34} delay={720} />

        <Animated.View style={[styles.orbitWrap, { width: radar * 0.78, height: radar * 0.78 }, orbitStyle]}>
          <View style={[styles.orbitDot, { backgroundColor: accent }]} />
        </Animated.View>

        <View style={styles.radarPin}>
          <Ping active={active} color={colors.green} size={34} duration={1700} />
          <View style={styles.radarPinHead} />
          <View style={styles.radarPinStem} />
        </View>
      </View>
    </View>
  );
}

/** A single stylized banknote. */
function Note({ accent, rotate = 0, opacity = 1, scale = 1 }: { accent: string; rotate?: number; opacity?: number; scale?: number }) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.note, { opacity, transform: [{ rotate: `${rotate}deg` }, { scale }] }]}>
      <LinearGradient
        colors={[accent, `${accent}E0`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.noteSeal}>
        <View style={styles.noteSealInner} />
      </View>
      <View style={[styles.noteCorner, { left: 9, top: 9 }]} />
      <View style={[styles.noteCorner, { right: 9, bottom: 9 }]} />
      <View style={[styles.noteShine, { transform: [{ rotate: '-12deg' }] }]} />
    </View>
  );
}

/** Slide 3 — cash on delivery with floating notes and popping coin. */
function CashScene({ active, accent }: SceneProps) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const t = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      t.value = 0;
      pop.value = 0;
      cancelAnimation(t);
      cancelAnimation(pop);
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
    pop.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 820, easing: Easing.out(Easing.back(1.7)) }),
        withDelay(320, withTiming(0, { duration: 640 }))
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(t);
      cancelAnimation(pop);
    };
  }, [active, t, pop]);

  const noteStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [10, -12]) },
      { rotate: `${interpolate(t.value, [0, 1], [-8, 8])}deg` },
      { scale: interpolate(t.value, [0, 1], [1, 1.04]) },
    ],
  }));

  const coinStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.12, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(pop.value, [0, 1], [44, -8]) },
      { scale: interpolate(pop.value, [0, 1], [0.45, 1.05]) },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.5, 1]) }],
    opacity: interpolate(pop.value, [0, 0.15, 1], [0, 1, 1]),
  }));

  const sparkleA = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.5, 1], [0.25, 1, 0.25]),
    transform: [{ scale: interpolate(t.value, [0, 0.5, 1], [0.7, 1.1, 0.7]) }],
  }));
  const sparkleB = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.5, 1], [1, 0.2, 1]),
    transform: [{ scale: interpolate(t.value, [0, 0.5, 1], [1.1, 0.7, 1.1]) }],
  }));

  return (
    <View style={styles.stage}>
      <View style={{ width: SCENE, height: SCENE, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.noteSlot, { transform: [{ translateX: -40 }], opacity: 0.55 }]}>
          <Note accent={accent} rotate={-16} />
        </View>
        <View style={[styles.noteSlot, { transform: [{ translateX: 40 }], opacity: 0.55 }]}>
          <Note accent={accent} rotate={14} />
        </View>

        <Animated.View style={noteStyle}>
          <Note accent={accent} />
        </Animated.View>

        <Animated.View
          style={[
            styles.coin,
            { left: SCENE * 0.16, bottom: SCENE * 0.14 },
            coinStyle,
          ]}>
          <LinearGradient
            colors={[colors.green, '#2EA44F']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.coinRing} />
        </Animated.View>

        <Animated.View
          style={[
            styles.okBadge,
            { right: SCENE * 0.1, top: SCENE * 0.14 },
            badgeStyle,
          ]}>
          <Ionicons name="checkmark" size={20} color={colors.white} />
        </Animated.View>

        <Animated.View style={[styles.sparkle, { top: SCENE * 0.14, left: SCENE * 0.18 }, sparkleA]}>
          <Ionicons name="sparkles" size={22} color={colors.onboardingYellow} />
        </Animated.View>
        <Animated.View style={[styles.sparkle, { bottom: SCENE * 0.16, right: SCENE * 0.2 }, sparkleB]}>
          <Ionicons name="sparkles" size={16} color={colors.brandWarm} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Top-level picker — keeps each pre-login slide's hero self-contained. */
export default function HeroScene({
  variant,
  active,
  accent,
}: {
  variant: 0 | 1 | 2;
  active: boolean;
  accent: string;
}) {
  if (variant === 0) return <RequestScene active={active} accent={accent} />;
  if (variant === 1) return <TrackScene active={active} accent={accent} />;
  return <CashScene active={active} accent={accent} />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  stage: {
    width: SCENE,
    height: SCENE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCENE,
    height: SCENE * 0.92,
    borderRadius: 30,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#F0EFEC',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F1F0ED',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#F1F0ED',
  },
  routeBand: {
    position: 'absolute',
    height: 4,
    overflow: 'hidden',
  },
  dashRow: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dashRowInner: {
    flexDirection: 'row',
  },
  dashSegH: {
    borderRadius: 2,
  },
  dashSegV: {
    borderRadius: 2,
  },
  pinSlot: {
    position: 'absolute',
  },
  pinHead: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  box: {
    width: BOX,
    height: BOX * 0.72,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  boxTape: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  boxLid: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    height: '16%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  road: {
    position: 'absolute',
    borderRadius: roadRadius,
    backgroundColor: '#F4F3F1',
    overflow: 'hidden',
  },
  roadMask: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  radarCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#F0EFEC',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  ping: {
    position: 'absolute',
  },
  radarCrossH: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 1,
    borderTopWidth: 1,
  },
  radarCrossV: {
    position: 'absolute',
    top: '18%',
    bottom: '18%',
    width: 1,
    borderLeftWidth: 1,
  },
  orbitWrap: {
    position: 'absolute',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  orbitDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  radarPin: {
    position: 'absolute',
    width: 34,
    height: 46,
    alignItems: 'center',
  },
  radarPinHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  radarPinStem: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.green,
    marginTop: -2,
  },
  note: {
    width: 150,
    height: 92,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  noteSlot: {
    position: 'absolute',
  },
  noteSeal: {
    position: 'absolute',
    top: 24,
    left: 60,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSealInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  noteCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  noteShine: {
    position: 'absolute',
    top: -18,
    left: -14,
    width: 190,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  coin: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  coinRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  okBadge: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sparkle: {
    position: 'absolute',
  },
});