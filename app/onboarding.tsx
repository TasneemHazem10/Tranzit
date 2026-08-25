import React, { useRef, useState } from 'react';
import {
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
import Logo from '../src/components/Logo';
import AppButton from '../src/components/AppButton';
import { useAuth } from '../src/store/auth';
import { colors, fonts, radius } from '../src/theme';

const { width } = Dimensions.get('window');

/**
 * Drop your Figma 3D illustrations into mobile/assets/images as
 * splash-1.png / splash-2.png / splash-3.png to replace the emoji fallback.
 */
const ILLUSTRATIONS: (ImageSourcePropType | null)[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ILLUSTRATIONS[0] = require('../assets/images/splash-1.png');
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ILLUSTRATIONS[1] = require('../assets/images/splash-2.png');
} catch {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ILLUSTRATIONS[2] = require('../assets/images/splash-3.png');
} catch {}

type Slide = {
  key: string;
  color: string;
  title: string;
  subtitle: string;
  cta: string;
  emoji: string;
  illustration: ImageSourcePropType | null;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    color: colors.onboardingBlue,
    title: 'اطلب شحنتك في دقائق',
    subtitle: 'حدد موقعك، استلم، واشحن طردك للمناسبة بسهولة.',
    cta: 'استكمال',
    emoji: '🚚',
    illustration: ILLUSTRATIONS[0],
  },
  {
    key: '2',
    color: colors.onboardingYellow,
    title: 'تتبع شحنتك لحظة بلحظة',
    subtitle: 'توقع مكان شحنتك على الخريطة واستلم إشعارات بالتحديثات.',
    cta: 'استكمال',
    emoji: '📦',
    illustration: ILLUSTRATIONS[1],
  },
  {
    key: '3',
    color: colors.onboardingPurple,
    title: 'اختر طريقة الدفع التي تناسبك',
    subtitle: 'ادفع أونلاين، عند الاستلام أو عبر طرق دفع أخرى.',
    cta: 'إبدأ الآن',
    emoji: '💳',
    illustration: ILLUSTRATIONS[2],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { markOnboardingSeen } = useAuth();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/login');
  };

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
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
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={styles.page}>
            <LinearGradient
              colors={[item.color, `${item.color}00`]}
              locations={[0, 0.8]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.topRow}>
              <Logo width={110} variant="dark" />
            </View>
            <View style={styles.illuWrap}>
              <View style={[styles.illuCircle, { backgroundColor: `${item.color}55` }]}>
                {item.illustration ? (
                  <Image source={item.illustration} style={styles.illuImage} resizeMode="contain" />
                ) : (
                  <Text style={styles.illuEmoji}>{item.emoji}</Text>
                )}
              </View>
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
              <AppButton title={item.cta} onPress={onNext} />
              <View style={styles.dots}>
                {SLIDES.map((s, i) => (
                  <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  page: {
    width,
    flex: 1,
    alignItems: 'center',
  },
  topRow: {
    marginTop: 18,
    height: 40,
    justifyContent: 'center',
  },
  illuWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  illuCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  illuImage: {
    width: 190,
    height: 190,
  },
  illuEmoji: {
    fontSize: 96,
  },
  textBlock: {
    width: '100%',
    paddingHorizontal: 28,
    paddingBottom: 30,
    gap: 10,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: '#151514',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textGray,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 10,
  },
  dots: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 7,
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.dark,
  },
});
