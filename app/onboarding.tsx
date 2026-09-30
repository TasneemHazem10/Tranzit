import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Logo from '../src/components/Logo';
import HeroScene from '../src/components/onboarding/HeroScene';
import { PressableScale } from '../src/components/Motion';
import { useAuth } from '../src/store/auth';
import { useLanguage } from '../src/store/language';
import { fonts, radius, colors as themeColors, useTheme, type ThemeColors } from '../src/theme';

const { width } = Dimensions.get('window');
const TRACK_WIDTH = width - 56;
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

type Slide = {
  key: string;
  color: string;
  title: string;
  subtitle: string;
};

export default function Onboarding() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { markOnboardingSeen } = useAuth();
  const { t, isRTL } = useLanguage();
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const SLIDES: Slide[] = useMemo(() => [
    {
      key: '1',
      color: colors.onboardingBlue,
      title: t.onboardingSlide1Title,
      subtitle: t.onboardingSlide1Sub,
    },
    {
      key: '2',
      color: colors.onboardingYellow,
      title: t.onboardingSlide2Title,
      subtitle: t.onboardingSlide2Sub,
    },
    {
      key: '3',
      color: colors.onboardingPurple,
      title: t.onboardingSlide3Title,
      subtitle: t.onboardingSlide3Sub,
    },
  ], [t, colors]);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollX.value = e.contentOffset.x;
  });

  const finish = async () => {
    try {
      await markOnboardingSeen();
    } catch {}
    router.replace('/login');
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      if (listRef.current) {
        try {
          listRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
        } catch {
          listRef.current.scrollToOffset({ offset: (currentIndex + 1) * width, animated: true });
        }
      }
    } else {
      void finish();
    }
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        renderItem={({ item, index }) => (
          <SlideView
            slide={item}
            index={index}
            scrollX={scrollX}
            isRTL={isRTL}
            currentIndex={currentIndex}
            count={SLIDES.length}
            t={{
              next: t.onboardingNext,
              finish: t.onboardingFinish,
              skip: t.onboardingSkip,
            }}
            onNext={goNext}
            onSkip={finish}
          />
        )}
      />
    </SafeAreaView>
  );
}

function SlideView({
  slide,
  index,
  scrollX,
  isRTL,
  currentIndex,
  count,
  t,
  onNext,
  onSkip,
}: {
  slide: Slide;
  index: number;
  scrollX: SharedValue<number>;
  isRTL: boolean;
  currentIndex: number;
  count: number;
  t: { next: string; finish: string; skip: string };
  onNext: () => void;
  onSkip: () => void;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(scrollX.value, inputRange, [0.92, 1, 0.92], 'clamp'),
      },
    ],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], 'clamp'),
    transform: [{ scale: interpolate(scrollX.value, inputRange, [0.86, 1, 0.86], 'clamp') }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollX.value, inputRange, [36, 0, 36], 'clamp') }],
  }));

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={[`${slide.color}33`, `${slide.color}08`, 'transparent']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.topRow}>
        <View style={styles.brandBadge}>
          <Animated.View style={badgeStyle}>
            <Logo width={110} variant="white" />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.hero, heroStyle]}>
        <HeroScene variant={index as 0 | 1 | 2} accent={slide.color} active={currentIndex === index} />
      </Animated.View>

      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{slide.subtitle}</Text>

        <Footer
          currentIndex={currentIndex}
          scrollX={scrollX}
          isRTL={isRTL}
          count={count}
          t={t}
          onNext={onNext}
          onSkip={onSkip}
        />
      </Animated.View>
    </View>
  );
}

function Footer({
  currentIndex,
  scrollX,
  isRTL,
  count,
  t,
  onNext,
  onSkip,
}: {
  currentIndex: number;
  scrollX: SharedValue<number>;
  isRTL: boolean;
  count: number;
  t: { next: string; finish: string; skip: string };
  onNext: () => void;
  onSkip: () => void;
}) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.footer}>
      <View style={[styles.dots, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {Array.from({ length: count }, (_, i) => (
          <Dot key={i} index={i} scrollX={scrollX} />
        ))}
      </View>

      <View style={styles.progressTrack}>
        <ProgressFill scrollX={scrollX} count={count} />
      </View>

      <PressableScale onPress={onNext} style={styles.nextBtn}>
        <View style={[styles.nextBtnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons
            name={
              currentIndex === count - 1
                ? 'checkmark-circle'
                : isRTL
                  ? 'arrow-back'
                  : 'arrow-forward'
            }
            size={24}
            color={colors.white}
          />
          <Text style={styles.nextText}>
            {currentIndex === count - 1 ? t.finish : t.next}
          </Text>
        </View>
      </PressableScale>

      {currentIndex < count - 1 && (
        <Text style={styles.skipText} onPress={onSkip}>
          {t.skip}
        </Text>
      )}
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(scrollX.value, inputRange, [8, 24, 8], 'clamp'),
      backgroundColor: interpolateColor(
        scrollX.value,
        inputRange,
        [themeColors.border, themeColors.brand, themeColors.border]
      ),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function ProgressFill({ scrollX, count }: { scrollX: SharedValue<number>; count: number }) {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const style = useAnimatedStyle(() => ({
    width: interpolate(
      scrollX.value,
      [0, (count - 1) * width],
      [TRACK_WIDTH * 0.08, TRACK_WIDTH],
      'clamp'
    ),
  }));
  return <Animated.View style={[styles.progressFill, style]} />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  page: { width, flex: 1, alignItems: 'center' },
  topRow: { marginTop: 18, height: 62, justifyContent: 'center' },
  brandBadge: {
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  hero: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  textBlock: {
    width: '100%',
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: fonts.extraBold, fontSize: 26, color: colors.dark,
    textAlign: 'center', lineHeight: 40,
  },
  subtitle: {
    fontFamily: fonts.medium, fontSize: 15, color: colors.textGray,
    textAlign: 'center', lineHeight: 26, marginTop: 8, marginBottom: 24,
  },
  footer: { alignItems: 'center', gap: 14, width: '100%', paddingHorizontal: 28, paddingBottom: 26 },
  dots: { justifyContent: 'center', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    overflow: 'hidden',
    marginTop: -4,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  nextBtn: {
    width: '84%',
    alignSelf: 'center',
    borderRadius: radius.lg,
    height: 56,
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  nextBtnInner: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  nextText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  skipText: {
    fontFamily: fonts.semiBold, fontSize: 14, color: colors.textGray,
    textAlign: 'center', textDecorationLine: 'underline',
  },
});