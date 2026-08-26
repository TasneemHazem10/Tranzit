import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../src/components/Logo';
import { useAuth } from '../src/store/auth';
import { colors, fonts, radius } from '../src/theme';

const { width } = Dimensions.get('window');

type Slide = {
  key: string;
  color: string;
  title: string;
  subtitle: string;
  emoji: string;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    color: colors.onboardingBlue,
    title: 'اطلب شحنتك في دقائق',
    subtitle: 'حدد موقعك، استلم، واشحن طردك للمناسبة بسهولة.',
    emoji: '🚚',
  },
  {
    key: '2',
    color: colors.onboardingYellow,
    title: 'تتبع شحنتك لحظة بلحظة',
    subtitle: 'توقع مكان شحنتك على الخريطة واستلم إشعارات بالتحديثات.',
    emoji: '📦',
  },
  {
    key: '3',
    color: colors.onboardingPurple,
    title: 'اختر طريقة الدفع التي تناسبك',
    subtitle: 'ادفع أونلاين، عند الاستلام أو عبر طرق دفع أخرى.',
    emoji: '💳',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { markOnboardingSeen } = useAuth();
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/login');
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      void finish();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        renderItem={({ item, index }) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const opacity = scrollX.interpolate({ inputRange, extrapolate: 'clamp', outputRange: [0, 1, 0] });
          const scale = scrollX.interpolate({ inputRange, extrapolate: 'clamp', outputRange: [0.85, 1, 0.85] });
          const translate = scrollX.interpolate({ inputRange, extrapolate: 'clamp', outputRange: [40, 0, 40] });

          return (
            <View style={styles.page}>
              <LinearGradient
                colors={[item.color, `${item.color}00`]}
                locations={[0, 0.7]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.topRow}>
                <Logo width={110} variant="dark" />
              </View>

              <View style={styles.illuWrap}>
                <Animated.View
                  style={[
                    styles.illuCircle,
                    { backgroundColor: `${item.color}55` },
                    { opacity, transform: [{ scale }] },
                  ]}>
                  <Text style={styles.illuEmoji}>{item.emoji}</Text>
                </Animated.View>
              </View>

              <Animated.View style={[styles.textBlock, { transform: [{ translateY: translate }], opacity }]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>

                <View style={styles.bottomSection}>
                  <View style={styles.dots}>
                    {SLIDES.map((_, i) => {
                      const dotWidth = scrollX.interpolate({
                        inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                        extrapolate: 'clamp',
                        outputRange: [8, 24, 8],
                      });
                      const dotColor = scrollX.interpolate({
                        inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                        extrapolate: 'clamp',
                        outputRange: [colors.border, colors.dark, colors.border],
                      });
                      return (
                        <Animated.View
                          key={i}
                          style={[
                            styles.dot,
                            { width: dotWidth, backgroundColor: dotColor },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <Animated.View
                    style={{
                      transform: [{
                        scale: scrollX.interpolate({
                          inputRange: [(SLIDES.length - 2) * width, (SLIDES.length - 1) * width],
                          extrapolate: 'clamp',
                          outputRange: [1, 1],
                        }),
                      }],
                    }}>
                    <View style={styles.nextBtn} onTouchEnd={goNext}>
                      <Ionicons
                        name={currentIndex === SLIDES.length - 1 ? 'checkmark-circle' : 'arrow-back'}
                        size={24}
                        color={colors.white}
                      />
                      <Text style={styles.nextText}>
                        {currentIndex === SLIDES.length - 1 ? 'إبدأ الآن' : 'استكمال'}
                      </Text>
                    </View>
                  </Animated.View>

                  {currentIndex < SLIDES.length - 1 && (
                    <Text style={styles.skipText} onPress={finish}>
                      تخطي
                    </Text>
                  )}
                </View>
              </Animated.View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  page: { width, flex: 1, alignItems: 'center' },
  topRow: { marginTop: 18, height: 40, justifyContent: 'center' },
  illuWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  illuCircle: {
    width: 220, height: 220, borderRadius: 110,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  illuEmoji: { fontSize: 96 },
  textBlock: {
    width: '100%', paddingHorizontal: 28, paddingBottom: 30,
  },
  title: {
    fontFamily: fonts.extraBold, fontSize: 26, color: '#151514',
    textAlign: 'center', lineHeight: 40,
  },
  subtitle: {
    fontFamily: fonts.medium, fontSize: 15, color: colors.textGray,
    textAlign: 'center', lineHeight: 26, marginTop: 8, marginBottom: 24,
  },
  bottomSection: { alignItems: 'center', gap: 14 },
  dots: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.dark, borderRadius: radius.lg,
    height: 56, paddingHorizontal: 36, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  nextText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  skipText: {
    fontFamily: fonts.semiBold, fontSize: 14, color: colors.textGray,
    textAlign: 'center', textDecorationLine: 'underline',
  },
});
