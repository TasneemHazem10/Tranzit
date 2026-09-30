import React, { useCallback, useEffect, useRef } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useMotion';
import { screenSpring } from './presets';
import { colors as themeColors, radius, useTheme, type ThemeColors } from '../../theme';

export type SheetSnap = 'full' | 'peek' | 'hidden';

type Props = {
  children: React.ReactNode;
  /** Visible height when collapsed to "peek". */
  peekHeight: number;
  /** Height reserved for the fixed handle/header area above the scrollable content. */
  headerHeight?: number;
  initialSnap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  /** Fired when the sheet is dragged fully away. Use it to unmount / reset. */
  onRequestClose?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Disable the drag gesture (e.g. while children are loading). */
  dragEnabled?: boolean;
  /** Optional tint applied to the top accent bar. */
  accentColor?: string;
};

const PULL = 48;

/**
 * A bottom sheet with real drag physics: swipe up to expand, down to collapse
 * to a peek, and further down to dismiss. Springs settle on the UI thread.
 */
export default function DraggableSheet({
  children,
  peekHeight,
  headerHeight = 12,
  initialSnap = 'full',
  onSnapChange,
  onRequestClose,
  style,
  dragEnabled = true,
  accentColor = themeColors.brand,
}: Props) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const reduced = useReducedMotion();

  const contentHeight = useSharedValue(0);
  const translateY = useSharedValue(2000);
  const startY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const contentRef = useRef(0);

  const snapRef = useRef<SheetSnap>(initialSnap);
  const onSnapChangeRef = useRef(onSnapChange);
  const onRequestCloseRef = useRef(onRequestClose);
  useEffect(() => {
    onSnapChangeRef.current = onSnapChange;
    onRequestCloseRef.current = onRequestClose;
  }, [onSnapChange, onRequestClose]);

  const offsetsFor = useCallback(
    (snap: SheetSnap, h: number) => {
      const fullY = 0;
      const peekY = Math.max(0, h - peekHeight);
      const hiddenY = h;
      switch (snap) {
        case 'full':
          return fullY;
        case 'peek':
          return peekY;
        default:
          return hiddenY;
      }
    },
    [peekHeight]
  );

  const settle = useCallback(
    (snap: SheetSnap) => {
      const h = contentRef.current;
      if (h <= 0) return;
      translateY.value = withSpring(offsetsFor(snap, h), screenSpring);
    },
    [offsetsFor, translateY]
  );

  const notifySnap = useCallback((offset: number) => {
    const h = contentRef.current;
    let next: SheetSnap = 'full';
    if (offset <= 1) next = 'full';
    else if (h > 0 && offset >= h - 1) next = 'hidden';
    else next = 'peek';
    snapRef.current = next;
    onSnapChangeRef.current?.(next);
    if (next === 'hidden') onRequestCloseRef.current?.();
  }, []);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0) return;
      contentRef.current = h;
      contentHeight.value = h;
      if (reduced) {
        translateY.value = 0;
        opacity.value = 1;
        return;
      }
      translateY.value = withSpring(offsetsFor(snapRef.current, h), screenSpring);
      opacity.value = withTiming(1, { duration: 280 });
    },
    [contentHeight, opacity, reduced, offsetsFor, translateY]
  );

  const pan = Gesture.Pan()
    .enabled(dragEnabled && !reduced)
    .activeOffsetY([-10, 10])
    .failOffsetY([-5, 5])
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate(e => {
      const h = contentHeight.value;
      const next = clamp(startY.value + e.translationY, 0, h + PULL);
      translateY.value = next;
    })
    .onEnd(e => {
      const h = contentHeight.value;
      if (h <= 0) return;
      const peek = Math.max(0, h - peekHeight);
      const current = translateY.value;
      const velocity = e.velocityY;

      let next: number;
      if (velocity > 800) {
        next = h;
      } else if (velocity < -800) {
        next = 0;
      } else if (current < peek * 0.55) {
        next = 0;
      } else if (current > peek + (h - peek) * 0.5) {
        next = h;
      } else {
        next = peek;
      }
      translateY.value = withSpring(next, screenSpring);
      runOnJS(notifySnap)(next);
    });

  // Re-settle whenever the content grows/shrinks so the snap is preserved.
  useEffect(() => {
    if (reduced) return;
    settle(snapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const accentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, 240], [0.55, 0.1]),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.sheet, style, animatedStyle]} onLayout={onContentLayout}>
        <Animated.View style={[styles.accentBar, { backgroundColor: accentColor }, accentOpacity]} />
        {reduced ? (
          <View style={styles.reducedWrap}>
            <View style={[styles.handle, { height: headerHeight }]} />
            {children}
          </View>
        ) : (
          <>
            <View style={[styles.handle, { height: headerHeight }]} />
            {children}
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card + 'F2',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    marginBottom: 6,
    borderRadius: 2,
    backgroundColor: colors.dark + '30',
    minHeight: 4,
  },
  reducedWrap: {
    width: '100%',
  },
});