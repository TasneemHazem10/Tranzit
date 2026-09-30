import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Entrance } from './Motion';
import { useLanguage } from '../store/language';
import { fonts, useTheme, type ThemeColors } from '../theme';

export default function DividerRow() {
  const colors = useTheme();
  const styles = makeStyles(colors);
  const { t } = useLanguage();
  return (
    <Entrance direction="fade" distance={0} delay={180}>
      <View style={styles.row}>
        <View style={styles.line} />
        <Text style={styles.text}>{t.orDivider}</Text>
        <View style={styles.line} />
      </View>
    </Entrance>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  text: {
    color: colors.textGray,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
