import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import IconButton from '../src/components/IconButton';
import AppButton from '../src/components/AppButton';
import { Entrance } from '../src/components/Motion';
import { TERMS_DOCUMENT, type TermsItem } from '../src/lib/terms';
import { useLanguage } from '../src/store/language';
import { fonts, radius, useTheme, type ThemeColors } from '../src/theme';

function ItemContent({ item, colors }: { item: TermsItem; colors: ThemeColors }) {
  const styles = makeStyles(colors);
  if (typeof item === 'string') {
    return (
      <View style={[styles.introBlock, { borderRightColor: colors.brand }]}>
        <Text style={[styles.introText, { color: colors.dark }]}>{item}</Text>
      </View>
    );
  }
  return (
    <View style={styles.itemWrap}>
      <View style={[styles.bulletRow, { flexDirection: 'row' }]}>
        <View style={[styles.bulletDot, { backgroundColor: colors.brand }]} />
        <Text style={[styles.itemText, { color: colors.dark }]}>{item.heading}</Text>
      </View>
      {item.subs.length > 0 && (
        <View style={styles.subList}>
          {item.subs.map((sub, si) => (
            <View key={si} style={[styles.bulletRow, { flexDirection: 'row' }]}>
              <Text style={[styles.bulletSub, { color: colors.brand }]}>○</Text>
              <Text style={[styles.itemText, styles.itemTextSub, { color: colors.textGray }]}>{sub}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function Terms() {
  const router = useRouter();
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t, isRTL } = useLanguage();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Entrance direction="down" distance={14} style={styles.headerRow}>
        <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} size="md" variant="light" onPress={() => router.back()} accessibilityLabel={t.termsBack} />
        <Text style={[styles.headerTitle, { color: colors.dark }]} numberOfLines={1}>
          {t.termsTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </Entrance>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}>
        <Entrance delay={60}>
          <View style={styles.hero}>
            <LinearGradient
              colors={[colors.brand, colors.brandDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadge}>
              <Ionicons name="document-text-outline" size={30} color={colors.white} />
            </LinearGradient>
            <Text style={[styles.heroTitle, { color: colors.dark }]}>{t.termsTitle}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textGray }]}>{t.termsSubtitle}</Text>
            <View style={styles.versionPill}>
              <Ionicons name="time-outline" size={13} color={colors.brand} />
              <Text style={[styles.versionText, { color: colors.brand }]}>
                {t.termsUpdated} · {TERMS_DOCUMENT.version}
              </Text>
            </View>
          </View>
        </Entrance>

        <Entrance delay={120}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            {TERMS_DOCUMENT.preamble.map((p, i) => (
              <Text key={i} style={[styles.para, { color: colors.dark }]}>
                {p}
              </Text>
            ))}
            <View style={[styles.lawList, { gap: 8 }]}>
              {TERMS_DOCUMENT.lawList.map((law, i) => (
                <View key={i} style={[styles.bulletRow, { flexDirection: 'row' }]}>
                  <Text style={[styles.bulletSub, { color: colors.brand }]}>●</Text>
                  <Text style={[styles.lawText, { color: colors.dark }]}>{law}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.closingBox, { backgroundColor: colors.brand + '12', borderColor: colors.brand + '3D' }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand} />
              <Text style={[styles.closingText, { color: colors.dark }]}>{TERMS_DOCUMENT.closing}</Text>
            </View>
          </View>
        </Entrance>

        {TERMS_DOCUMENT.sections.map((section, i) => (
          <Entrance key={section.title} delay={Math.min(180 + i * 40, 420)} distance={20}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionBadge, { backgroundColor: colors.dark }]}>
                  <Text style={[styles.sectionNum, { color: colors.white }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.dark }]}>{section.title}</Text>
              </View>
              <View style={[styles.sectionDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.sectionBody}>
                {section.items.map((item, ii) => (
                  <ItemContent key={ii} item={item} colors={colors} />
                ))}
              </View>
            </View>
          </Entrance>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton title={t.termsDone} onPress={() => router.back()} variant="primary" size="lg" />
        <Text style={[styles.footerHint, { color: colors.textLight, textAlign: 'center' }]}>
          {TERMS_DOCUMENT.issuer} · {t.termsUpdated} {TERMS_DOCUMENT.version}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    headerTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: 8,
    },
    headerSpacer: {
      width: 42,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 16,
    },
    hero: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 18,
    },
    heroBadge: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      shadowColor: colors.brandDeep,
      shadowOpacity: 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    heroTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontFamily: fonts.medium,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 4,
    },
    versionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: colors.brandSoft,
    },
    versionText: {
      fontFamily: fonts.semiBold,
      fontSize: 11.5,
    },
    card: {
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: 16,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    para: {
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 26,
      marginBottom: 10,
    },
    lawList: {
      marginTop: 2,
      marginBottom: 10,
    },
    lawText: {
      fontFamily: fonts.medium,
      fontSize: 13.5,
      lineHeight: 24,
      flex: 1,
    },
    bulletRow: {
      alignItems: 'flex-start',
      gap: 8,
    },
    bulletDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginTop: 7,
    },
    bulletSub: {
      fontFamily: fonts.bold,
      fontSize: 11,
      lineHeight: 20,
      marginTop: 1,
      width: 14,
      textAlign: 'center',
    },
    closingBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: 12,
    },
    closingText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      lineHeight: 23,
      flex: 1,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionBadge: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionNum: {
      fontFamily: fonts.extraBold,
      fontSize: 14,
    },
    sectionTitle: {
      fontFamily: fonts.extraBold,
      fontSize: 14.5,
      lineHeight: 22,
      flex: 1,
    },
    sectionDivider: {
      height: 1,
      marginVertical: 12,
    },
    sectionBody: {
      gap: 12,
    },
    itemWrap: {
      gap: 8,
    },
    itemText: {
      fontFamily: fonts.medium,
      fontSize: 13.5,
      lineHeight: 24,
      flex: 1,
    },
    itemTextSub: {
      fontSize: 13,
      lineHeight: 22,
    },
    subList: {
      gap: 7,
      marginInlineStart: 14,
    },
    introBlock: {
      borderRightWidth: 3,
      paddingRight: 10,
    },
    introText: {
      fontFamily: fonts.bold,
      fontSize: 13.5,
      lineHeight: 23,
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 4,
      gap: 6,
      backgroundColor: colors.background,
    },
    footerHint: {
      fontFamily: fonts.medium,
      fontSize: 10.5,
    },
  });